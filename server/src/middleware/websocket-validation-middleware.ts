import { WebSocketContext } from "./websocket-auth-middleware";
import { z } from "zod";
import ValidationService from "../services/validation-service";
import { SchemaValidationError } from "../errors/index";
import logger from "../logger";

const BaseWebSocketMessageSchema = z.object({
  op: z.string().min(1, "Operation is required"),
});

// Schema for specific operations
const OperationSchemas: Record<string, z.ZodSchema> = {
  join_game: z.object({
    op: z.literal("join_game"),
    create: z.boolean().optional(),
    playername: z.string().min(1, "Player name is required").max(50, "Player name too long").optional(),
  }),
  select_categories: z.object({
    op: z.literal("select_categories"),
    categories: z.array(z.string()).optional(),
  }),
  select_category: z.object({
    op: z.literal("select_category"),
    catagory: z.string().min(1, "Category is required"),
  }),
  confirm_selections: z.object({
    op: z.literal("confirm_selections"),
  }),
  next_question: z.object({
    op: z.literal("next_question"),
  }),
  vote: z.object({
    op: z.literal("vote"),
    option: z.number().int().min(1).max(3, "Vote option must be 1, 2, or 3"),
  }),
  ping: z.object({
    op: z.literal("ping"),
  }),
  reconnect_status: z.object({
    op: z.literal("reconnect_status"),
  }),
  reset_game: z.object({
    op: z.literal("reset_game"),
  }),
  // CAH specific operations
  select_card_packs: z.object({
    op: z.literal("select_card_packs"),
    packs: z.array(z.string()).min(1, "At least one card pack must be selected"),
  }),
  submit_cards: z.object({
    op: z.literal("submit_cards"),
    cardIds: z.array(z.string()).min(1, "At least one card must be submitted"),
  }),
  judge_cards: z.object({
    op: z.literal("judge_cards"),
    winnerId: z.string().min(1, "Winner ID is required"),
  }),
};

export class WebSocketValidationMiddleware {
  static validateMessage(context: WebSocketContext, next: () => Promise<void>): Promise<void> {
    const { data, ws, gameManager } = context;

    try {
      // First validate base message structure
      ValidationService.validateMessageStructure(data, BaseWebSocketMessageSchema);

      // Validate operation-specific schema if it exists
      const op = data.op;
      const schema = OperationSchemas[op];

      if (schema) {
        try {
          ValidationService.validateMessageStructure(data, schema);
        } catch (error) {
          if (error instanceof SchemaValidationError) {
            throw error;
          }
          // Re-throw as SchemaValidationError for consistency
          throw new SchemaValidationError(op, error.issues || []);
        }
      }

      // TODO: Add business logic validation once GameManager interface supports IGameState
      // For now, we rely on individual operation handlers to perform business validation

      // For unknown operations, just ensure basic structure is valid
      return next();

    } catch (error) {
      // Log validation failures
      logger.warn(`Message validation failed`, {
        operation: data?.op || 'unknown',
        gameId: ws.data.game,
        playerId: ws.data.player,
        error: error.message,
        data: JSON.stringify(data).substring(0, 500)
      });

      throw error;
    }
  }
}