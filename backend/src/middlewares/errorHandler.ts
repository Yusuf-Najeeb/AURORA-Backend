/* eslint-disable no-unused-vars */
import winston from "winston";
import { NextFunction, Request, Response } from "express";
import {
  ApiError,
  BadRequestError,
  InternalError,
  NotFoundError,
} from "../core/api/ApiError";
import settings from "../core/config/settings";

const TESTING: boolean = settings.serverEnvironment === "TEST";

const files = new winston.transports.File({ filename: "logs/error.log" });
winston.add(files);

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };

  error.message = err.message;

  // Log to console for dev
  !TESTING && console.log((err as any).stack);

  console.log(err instanceof ApiError, "instance");
  if (err instanceof ApiError == true) {
    ApiError.handle(err, res);
  } else {
    // Mongoose bad ObjectId
    if (err.name === "CastError") {
      ApiError.handle(new NotFoundError("resource not found"), res);
    }

    // Mongoose duplicate key
    if ((err as any).code === 11000) {
      // get the dup key field out of the err message
      let field = err.message.split("index:")[1];
      // now we have `field_1 dup key`
      field = field.split(" dup key")[0];
      field = field.substring(0, field.lastIndexOf("_")); // returns field
      field = field.trim();
      const message = `${field} already exists`;
      ApiError.handle(new BadRequestError(message), res);
    }

    // Mongoose validation error
    if (err.name === "ValidationError") {
      const message: string = Object.values((err as any).errors)
        .map((val: any): string => val.message)
        .join(", ");
      ApiError.handle(new BadRequestError(message), res);
    }

    if (error.message === "Route Not found") {
      ApiError.handle(new NotFoundError("requested resource not found"), res);
    }

    winston.error(err.stack);

    ApiError.handle(new InternalError(), res);
  }
};

export default errorHandler;
