import { GameSocket } from "../lib/router";
import { WebSocketAuthMiddleware } from "./websocket-auth-middleware";
import { WebSocketLoggingMiddleware } from "./websocket-logging-middleware";
import { WebSocketValidationMiddleware } from "./websocket-validation-middleware";
import { WebSocketErrorMiddleware } from "./websocket-error-middleware";

// Define types locally to avoid circular imports
export interface WebSocketContext {
  ws: GameSocket;
  data: any;
  gameManager: any;
}

export class WebSocketMiddlewarePipeline {
  private middlewares: ((context: WebSocketContext, next: () => Promise<void>) => Promise<void>)[] = [];

  use(middleware: (context: WebSocketContext, next: () => Promise<void>) => Promise<void>): this {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(context: WebSocketContext): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        await middleware(context, next);
      }
    };

    await next();
  }
}

// Default middleware pipeline
export const createDefaultMiddlewarePipeline = (gameManager: any): WebSocketMiddlewarePipeline => {
  return new WebSocketMiddlewarePipeline()
    .use(WebSocketErrorMiddleware.handleErrors)
    .use(WebSocketLoggingMiddleware.logRequest)
    .use(WebSocketAuthMiddleware.authenticate)
    .use(WebSocketValidationMiddleware.validateMessage);
};

export {
  WebSocketAuthMiddleware,
  WebSocketLoggingMiddleware,
  WebSocketValidationMiddleware,
  WebSocketErrorMiddleware
};