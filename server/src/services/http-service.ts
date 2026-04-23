import { Catagories, CatagoriesSchema } from "../types";
import { PushEvent } from "@octokit/webhooks-types";
import logger from "../logger";
import { db } from "../db";
import { categories, cahCards } from "../db/schema";
import { sql } from "drizzle-orm";

export interface IHttpService {
  getQuestionsList(): Promise<Catagories>;
  handleCategories(): Promise<Response>;
  handleCAHPacks(): Promise<Response>;
  handleGithubWebhook(request: Request, server: any, deploymentInProgress: boolean): Promise<Response>;
}

export class HttpService implements IHttpService {
  constructor() {}

  async getQuestionsList(): Promise<Catagories> {
    // Simple in-memory cache to avoid repeated DB round-trips per game start
    if (HttpService._questionsCache) return HttpService._questionsCache;

    try {
      const rows = await db.select({
        name: categories.name,
        questions: categories.questions,
        is_nsfw: categories.is_nsfw,
      }).from(categories);

      const categoriesData: Catagories = {};
      for (const row of rows) {
        categoriesData[row.name] = {
          flags: { is_nsfw: row.is_nsfw },
          questions: row.questions as string[],
        };
      }

      HttpService._questionsCache = categoriesData;
      logger.info(`Loaded ${rows.length} categories from database`);
      return categoriesData;
    } catch (error) {
      logger.error("Failed to load categories from database:", error);
      return {};
    }
  }

  private static _questionsCache: Catagories | null = null;

  async handleCategories(): Promise<Response> {
    try {
      const categories = await this.getQuestionsList();
      const response = Response.json(categories);
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Cache-Control", "max-age=86400");
      return response;
    } catch (error) {
      console.error("Error fetching categories:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
      });
    }
  }

  async handleCAHPacks(): Promise<Response> {
    try {
      const packRows = await db
        .select({
          pack_name: cahCards.pack_name,
          card_type: cahCards.card_type,
          card_count: sql<number>`count(*)`.as("card_count"),
        })
        .from(cahCards)
        .groupBy(cahCards.pack_name, cahCards.card_type)
        .orderBy(cahCards.pack_name, cahCards.card_type);

      const packsMap = new Map<string, {
        id: string;
        name: string;
        blackCards: number;
        whiteCards: number;
        isOfficial: boolean;
        isNSFW: boolean;
      }>();

      for (const row of packRows) {
        const pack = packsMap.get(row.pack_name) ?? {
          id: row.pack_name,
          name: row.pack_name,
          blackCards: 0,
          whiteCards: 0,
          isOfficial: this.isOfficialPack(row.pack_name),
          isNSFW: this.isNSFWPack(row.pack_name),
        };

        if (row.card_type === "black") {
          pack.blackCards = Number(row.card_count);
        } else if (row.card_type === "white") {
          pack.whiteCards = Number(row.card_count);
        }

        packsMap.set(row.pack_name, pack);
      }

      const response = Response.json(Array.from(packsMap.values()));
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Cache-Control", "max-age=3600");
      return response;
    } catch (error) {
      console.error("Error fetching CAH packs:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
      });
    }
  }

  private isOfficialPack(packName: string): boolean {
    // Official packs are those from Cards Against Humanity LLC
    const officialPacks = [
      'CAH Base Set',
      'CAH: First Expansion',
      'CAH: Second Expansion',
      'CAH: Third Expansion',
      'CAH: Fourth Expansion',
      'CAH: Fifth Expansion',
      'CAH: Sixth Expansion',
      'CAH Base Set',
      'CAH: Box Expansion',
      'CAH: Red Box Expansion',
      'CAH: Blue Box Expansion',
      'CAH: Green Box Expansion',
      'CAH: Main Deck',
      'CAH: College Pack',
      'CAH: 2000s Nostalgia Pack',
      'CAH: A.I. Pack',
      'CAH: Ass Pack',
      'CAH: Human Pack',
      'CAH: Procedurally-Generated Cards',
      'CAH: Canadian Conversion Kit',
      'CAH: UK Conversion Kit',
      'CAH: Family Edition (Free Print & Play Public Beta)',
      'CAH: Hidden Gems Bundle: A Few New Cards We Crammed Into This Bundle Pack (Amazon Exclusive)',
    ];
    return officialPacks.some(official => packName.startsWith(official.split(':')[0]));
  }

  private isNSFWPack(packName: string): boolean {
    // Most CAH packs are NSFW, but some are marked as family-friendly
    const cleanPacks = [
      'CAH: Family Edition (Free Print & Play Public Beta)',
      'Kids Against Maturity',
      'Kids Create Absurdity',
      'KinderPerfect',
      'KinderPerfect: A Timeout For Parents (Kickstarter Set)',
      'KinderPerfect: More Expansion Pack',
      'KinderPerfect: Naughty Expansion Pack',
      'KinderPerfect: Tween Expansion Pack',
    ];
    return !cleanPacks.some(clean => packName.includes(clean));
  }

  async handleGithubWebhook(request: Request, server: any, deploymentInProgress: boolean): Promise<Response> {
    try {
      const body = (await request.json()) as PushEvent;

      if (body.ref !== "refs/heads/master") {
        return new Response("Not main branch, ignoring", { status: 200 });
      }

      // Auto-deploy the server
      logger.info("Starting automatic deployment...");
      try {
        const { spawn } = await import("child_process");
        const { resolve } = await import("path");
        const projectRoot = '/opt/never-have-i-ever-server/';
        const scriptPath = resolve(projectRoot, "deploy-server.sh");

        logger.info(`Running deployment script at: ${scriptPath}`);
        logger.info(`Working directory: ${projectRoot}`);

        const deployProcess = spawn(scriptPath, [], {
          cwd: projectRoot,
          stdio: "inherit",
          shell: true,
          env: { ...process.env, USER: process.env.USER || "nginx" }
        });

        deployProcess.on("close", (code) => {
          if (code === 0) {
            logger.info("Deployment completed successfully");
          } else {
            logger.error(`Deployment failed with exit code ${code}`);
          }
        });

        deployProcess.on("error", (error) => {
          logger.error("Failed to start deployment:", error);
        });

      } catch (deployError) {
        logger.error("Error initiating deployment:", deployError);
      }

      // Notify users about the automatic deployment
      server.publish(
        "notifications",
        JSON.stringify({
          delay: 5000,
          notification: "🚀 Auto-deploying latest version... Server will restart automatically!",
          op: "github_push",
        })
      );

      return new Response("Auto-deployment initiated", { status: 200 });
    } catch (error) {
      logger.error("Error handling GitHub webhook:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
}
