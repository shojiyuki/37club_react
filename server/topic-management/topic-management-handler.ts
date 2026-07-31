import type { NextFunction, Request, RequestHandler, Response } from "express";

import { DrizzleTopicsRepository } from "../repositories/topics-repository";
import { topicManagementInputSchema } from "./topic-management-schema";
import {
  TopicManagementService,
  TopicManagementTopicNotFoundError,
} from "./topic-management-service";

export function createTopicManagementHandler(
  service = new TopicManagementService(new DrizzleTopicsRepository()),
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const parsedInput = topicManagementInputSchema.safeParse(req.body);
    if (!parsedInput.success) {
      res.status(400).json({
        ok: false,
        error: "INVALID_INPUT",
        issues: parsedInput.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    try {
      const result =
        parsedInput.data.action === "select"
          ? await service.select(parsedInput.data)
          : await service.insert(parsedInput.data);
      res.json({ ok: true, ...result });
    } catch (error) {
      if (error instanceof TopicManagementTopicNotFoundError) {
        res.status(404).json({
          ok: false,
          error: "TOPIC_NOT_FOUND",
          topicId: error.topicId,
        });
        return;
      }

      next(error);
    }
  };
}
