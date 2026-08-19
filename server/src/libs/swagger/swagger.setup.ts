// libs
import swaggerUi from "swagger-ui-express";
// types
import type { Application } from "express";
// others
import { openApiSpec } from "./openapi";

export const setupSwagger = (app: Application): void => {
  const customCss = `
    .swagger-ui .topbar { display: none }

    /* Improve description text readability */
    .swagger-ui .opblock-description-wrapper p,
    .swagger-ui .opblock-description-wrapper li,
    .swagger-ui .markdown p,
    .swagger-ui .markdown li {
      color: #3b4151 !important;
      font-size: 14px !important;
      line-height: 1.6 !important;
    }

    /* Bold text styling */
    .swagger-ui .markdown strong {
      color: #1a1a1a !important;
      font-weight: 700 !important;
    }

    /* Inline code styling for better visibility */
    .swagger-ui .markdown code {
      background-color: #e8f4fd !important;
      color: #0066cc !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
      font-weight: 600 !important;
    }

    /* Bullet list styling */
    .swagger-ui .markdown ul {
      margin-left: 20px !important;
    }

    .swagger-ui .markdown li {
      margin-bottom: 4px !important;
    }

    /* Dark mode support via media query */
    @media (prefers-color-scheme: dark) {
      .swagger-ui .opblock-description-wrapper p,
      .swagger-ui .opblock-description-wrapper li,
      .swagger-ui .markdown p,
      .swagger-ui .markdown li {
        color: #d4d4d4 !important;
      }

      .swagger-ui .markdown strong {
        color: #ffffff !important;
      }

      .swagger-ui .markdown code {
        background-color: #2d3748 !important;
        color: #63b3ed !important;
      }
    }
  `;

  app.use(
    "/api-docs",
    swaggerUi.serve as unknown as Parameters<Application["use"]>[1],
    swaggerUi.setup(openApiSpec, {
      explorer: true,
      customCss,
      customSiteTitle: "Apartment Web API Documentation",
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: "list",
        filter: true,
        showRequestDuration: true
      }
    }) as unknown as Parameters<Application["use"]>[1]
  );

  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(openApiSpec);
  });
};
