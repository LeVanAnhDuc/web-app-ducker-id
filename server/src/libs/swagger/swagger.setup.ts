// libs
import swaggerUi from "swagger-ui-express";
// types
import type { Application, RequestHandler } from "express";
import type { OpenAPIV3 } from "openapi-types";

/**
 * Serves `/api-docs` (Swagger UI) and `/api-docs.json`. The document is read
 * through `getSpec` on every request: `mountHttp` mounts this before the
 * controllers, so the stop step and the 404 never see these paths, and builds
 * the document right after mounting them.
 */
export const setupSwagger = (
  app: Application,
  getSpec: () => OpenAPIV3.Document
): void => {
  const customCss = `
    .swagger-ui .topbar { display: none }

    .swagger-ui .opblock-description-wrapper p,
    .swagger-ui .opblock-description-wrapper li,
    .swagger-ui .markdown p,
    .swagger-ui .markdown li {
      color: #3b4151 !important;
      font-size: 14px !important;
      line-height: 1.6 !important;
    }

    .swagger-ui .markdown strong {
      color: #1a1a1a !important;
      font-weight: 700 !important;
    }

    .swagger-ui .markdown code {
      background-color: #e8f4fd !important;
      color: #0066cc !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
      font-weight: 600 !important;
    }

    .swagger-ui .markdown ul {
      margin-left: 20px !important;
    }

    .swagger-ui .markdown li {
      margin-bottom: 4px !important;
    }

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

  const uiOptions = {
    explorer: true,
    customCss,
    customSiteTitle: "Ducker ID API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "list",
      filter: true,
      showRequestDuration: true
    }
  };

  // swagger-ui-express renders `req.swaggerDoc` when it is set, which is how
  // a document that does not exist yet at mount time is served.
  const attachSpec: RequestHandler = (req, _res, next) => {
    (req as { swaggerDoc?: OpenAPIV3.Document }).swaggerDoc = getSpec();
    next();
  };

  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(getSpec());
  });

  app.use(
    "/api-docs",
    attachSpec,
    swaggerUi.serveFiles(undefined, uiOptions) as unknown as RequestHandler[],
    swaggerUi.setup(undefined, uiOptions) as unknown as RequestHandler
  );
};
