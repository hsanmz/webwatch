import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BookOpen,
  CheckCircle2,
  Code,
  Container,
  Database,
  ExternalLink,
  Info,
  ListChecks,
  Menu,
  Server,
  ShieldAlert,
  Terminal,
  X,
  type LucideIcon,
} from "lucide-react";

import { CodeBlock } from "@/components/app/code-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "WebWatch APM Documentation" },
      {
        name: "description",
        content:
          "Documentation for WebWatch APM: zero-config @webwatch/sdk, Node.js & browser integrations, REST API ingestion, and Telegram error alerts.",
      },
    ],
  }),
  component: DocsPage,
});

/* -------------------------------------------------------------------------- */
/*  Prose primitives                                                          */
/* -------------------------------------------------------------------------- */

function H3({ children }: { children: ReactNode }) {
  return <h3 className="mb-4 mt-10 text-xl font-bold text-foreground">{children}</h3>;
}

function P({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mb-4 max-w-reading leading-relaxed text-muted-foreground", className)}>
      {children}
    </p>
  );
}

function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="mb-6 ml-5 max-w-reading list-disc space-y-2 leading-relaxed text-muted-foreground">
      {children}
    </ul>
  );
}

function OL({ children }: { children: ReactNode }) {
  return (
    <ol className="mb-6 ml-5 max-w-reading list-decimal space-y-2 leading-relaxed text-muted-foreground">
      {children}
    </ol>
  );
}

function IC({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-xs bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  );
}

type CalloutTone = "brand" | "warning" | "info" | "neutral";

const CALLOUT_TONES: Record<CalloutTone, { box: string; title: string; body: string }> = {
  brand: {
    box: "border-primary/25 bg-primary-subtle",
    title: "text-primary",
    body: "text-foreground/85",
  },
  warning: {
    box: "border-warning/30 bg-warning-surface",
    title: "text-warning",
    body: "text-foreground/85",
  },
  info: {
    box: "border-info/30 bg-info-surface",
    title: "text-info",
    body: "text-foreground/85",
  },
  neutral: {
    box: "border-border bg-surface",
    title: "text-foreground",
    body: "text-muted-foreground",
  },
};

function Callout({
  tone = "neutral",
  title,
  children,
  icon: Icon,
}: {
  tone?: CalloutTone;
  title: string;
  children: ReactNode;
  icon?: LucideIcon;
}) {
  const styles = CALLOUT_TONES[tone];

  return (
    <div className={cn("mb-8 rounded-lg border px-4 py-4", styles.box)}>
      <h4 className={cn("mb-1.5 flex items-center gap-2 text-sm font-semibold", styles.title)}>
        {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
        {title}
      </h4>
      <div className={cn("text-sm leading-relaxed", styles.body)}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Documentation content                                                      */
/* -------------------------------------------------------------------------- */

const DOCS_SECTIONS = [
  {
    id: "prolog",
    title: "Prologue: Philosophy & Architecture",
    icon: BookOpen,
    content: (
      <>
        <P>
          WebWatch was created out of frustration with heavyweight, expensive enterprise monitoring
          suites that require complex daemon agents, tedious configuration files, and bury critical
          signals under thousands of vanity metrics. Our core philosophy is simple:{" "}
          <strong className="text-foreground">
            Track errors that break user experiences, alert the right engineer immediately, and
            never degrade your application's performance.
          </strong>
        </P>
        <P>
          The platform operates strictly as an Application Performance Monitoring (APM) and error
          tracking pipe. Lightweight SDKs capture crash stack traces, HTTP request context (URL and
          method), environment tags, and client metadata within milliseconds of an exception,
          streaming them to the nearest Cloudflare edge.
        </P>

        <Callout tone="brand" title="Serverless & Edge-First" icon={CheckCircle2}>
          The entire ingestion pipeline runs on Cloudflare Workers and Cloudflare D1. Inbound error
          batches are processed directly at the edge closest to your servers, persisted with
          prepared statements, and broadcast to Telegram without persistent background worker VMs or
          external polling queues.
        </Callout>

        <div className="panel mb-8 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Supported Environments, Frameworks & Architectures
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Node.js</Badge>
            <Badge variant="outline">Bun</Badge>
            <Badge variant="outline">Express.js</Badge>
            <Badge variant="outline">Hono</Badge>
            <Badge variant="outline">Fastify</Badge>
            <Badge variant="outline">Next.js</Badge>
            <Badge variant="outline">NestJS</Badge>
            <Badge variant="outline">Remix / Astro</Badge>
            <Badge variant="outline">React / Vite</Badge>
            <Badge variant="outline">Vue / Svelte</Badge>
            <Badge variant="outline">Docker & K8s</Badge>
            <Badge variant="outline">Monorepos (Turborepo/Nx)</Badge>
            <Badge variant="outline">Python</Badge>
            <Badge variant="outline">Go</Badge>
            <Badge variant="outline">PHP / Laravel</Badge>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "getting-started",
    title: "Getting Started",
    icon: ListChecks,
    content: (
      <>
        <P>
          Onboarding a new application to WebWatch takes less than two minutes. The workflow is
          fully self-service and requires no complex configuration files.
        </P>

        <H3>1. Register Your Application</H3>
        <OL>
          <li>
            Log in to the WebWatch dashboard via email OTP (connected to your Telegram account).
          </li>
          <li>
            Create a new site entry with your application's URL or identifier (e.g.,{" "}
            <IC>https://api.myapp.com</IC>).
          </li>
          <li>
            Navigate to the site details to generate a dedicated API Key (prefixed with <IC>ww_</IC>
            ).
          </li>
        </OL>

        <H3>2. Domain Verification</H3>
        <P>
          Before the ingestion endpoint accepts error logs for a site, you must complete domain
          ownership verification:
        </P>
        <OL>
          <li>
            In the site detail page on your dashboard, locate the verification token under the{" "}
            <em>Domain Verification</em> card.
          </li>
          <li>
            Create a plain text file named <IC>webwatch-verify.txt</IC> in your site's web root (so
            it is reachable via <IC>GET https://&lt;your-domain&gt;/webwatch-verify.txt</IC>) and
            paste the token as its content.
          </li>
          <li>
            Click <strong className="text-foreground">Verifikasi Domain</strong> in the dashboard
            (or call <IC>POST /api/sites/verify</IC>).
          </li>
        </OL>

        <Callout tone="warning" title="Ingestion Guard" icon={AlertTriangle}>
          While the site remains in <IC>pending</IC> verification status, the ingestion endpoint
          rejects incoming batches with <IC>403 site_not_verified</IC>. Once verified, all telemetry
          sent with your site's API key is accepted and persisted immediately.
        </Callout>

        <Callout
          tone="info"
          title="Backend APIs & Microservices (Docker / Express / Hono)"
          icon={Info}
        >
          If your application is a headless backend API without a static file root, you can easily
          fulfill domain verification with a lightweight route handler:
          <CodeBlock
            className="mt-3"
            code={`// Express.js
app.get("/webwatch-verify.txt", (req, res) => res.send("your_verification_token"));

// Hono
app.get("/webwatch-verify.txt", (c) => c.text("your_verification_token"));

// Fastify
fastify.get("/webwatch-verify.txt", async (request, reply) => "your_verification_token");`}
          />
        </Callout>

        <H3>3. Managing Environments</H3>
        <P>
          We recommend creating separate site entries for production and staging environments so
          alert routing and API keys remain isolated:
        </P>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Environment</TableHead>
              <TableHead>Recommended Usage</TableHead>
              <TableHead>Alert Routing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <IC>production</IC>
              </TableCell>
              <TableCell>Production deployments. Strict API key protection.</TableCell>
              <TableCell>Primary on-call Telegram team channel or chat.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>staging</IC>
              </TableCell>
              <TableCell>Pre-production and QA environments. Can be rotated freely.</TableCell>
              <TableCell>Internal dev group or quiet logging.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>development</IC>
              </TableCell>
              <TableCell>Local testing. Omit SDK initialization to stay dormant.</TableCell>
              <TableCell>Disabled (no Telegram spam).</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <P className="mt-4 text-sm">
          The <IC>environment</IC> tag is automatically derived by the SDK from{" "}
          <IC>process.env.NODE_ENV</IC> when running on Node.js/Bun, and defaults to{" "}
          <IC>production</IC> in the browser. You can also override it manually on any custom event.
        </P>
      </>
    ),
  },
  {
    id: "backend-nodejs",
    title: "Backend: @webwatch/sdk",
    icon: Server,
    content: (
      <>
        <P>
          For Node.js, Bun, and modern JavaScript runtimes, the official <IC>@webwatch/sdk</IC> npm
          package provides zero-config automatic crash capture with in-memory batching, exponential
          retry, and pre-built framework middleware.
        </P>

        <H3>Installation</H3>
        <CodeBlock
          file="terminal"
          className="mb-6"
          code={`npm install @webwatch/sdk
# or
bun add @webwatch/sdk
# or
pnpm add @webwatch/sdk`}
        />

        <H3>Zero-Config Setup</H3>
        <P>
          Export the two environment variables, then import the SDK once at the root entrypoint of
          your application:
        </P>
        <CodeBlock
          file=".env"
          className="mb-4"
          code={`WEBWATCH_KEY="ww_your_site_api_key"
WEBWATCH_URL="https://your-webwatch-instance.com"`}
        />
        <CodeBlock
          file="index.js"
          className="mb-6"
          code={`// Import once before importing anything else
import "@webwatch/sdk";

// Uncaught exceptions and unhandled rejections are now automatically captured!`}
        />

        <H3>Framework Middleware Helpers</H3>
        <P>
          Web frameworks often catch asynchronous errors inside route handlers before they trigger
          global unhandled rejections. Use our dedicated framework helpers to ensure complete
          coverage:
        </P>

        <div className="space-y-6">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Express.js</h4>
            <CodeBlock
              file="app.js"
              code={`import express from "express";
import { expressErrorMiddleware, wrapAsync } from "@webwatch/sdk/express";

const app = express();

app.get(
  "/api/checkout",
  wrapAsync(async (req, res) => {
    // Any rejected promise inside wrapAsync is passed to the error handler
    const result = await processOrder(req.body);
    res.json(result);
  })
);

// Register after all your routes
app.use(expressErrorMiddleware());

app.listen(3000);`}
            />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Hono</h4>
            <CodeBlock
              file="index.ts"
              code={`import { Hono } from "hono";
import { honoOnError } from "@webwatch/sdk/hono";

const app = new Hono();

// Global error handler captures exceptions and returns 500 JSON response
app.onError(honoOnError());

app.get("/", (c) => c.text("Hello World"));
export default app;`}
            />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Fastify</h4>
            <CodeBlock
              file="server.js"
              code={`import Fastify from "fastify";
import { fastifyErrorHandler } from "@webwatch/sdk/fastify";

const fastify = Fastify({ logger: true });

fastify.setErrorHandler(fastifyErrorHandler());

fastify.listen({ port: 3000 });`}
            />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Next.js</h4>
            <CodeBlock
              file="instrumentation.ts"
              code={`// Place in project root or src/ directory
export async function register() {
  await import("@webwatch/sdk/next").then((m) => m.register());
}`}
            />
          </div>
        </div>

        <H3>Manual Error Capture</H3>
        <P>Capture exceptions manually inside specific try-catch blocks:</P>
        <CodeBlock
          file="services/payment.js"
          className="mb-6"
          code={`import { captureError } from "@webwatch/sdk";

try {
  await chargeCard(amount);
} catch (error) {
  captureError(error, {
    url: "/api/charge",
    method: "POST",
  });
  throw error;
}`}
        />

        <H3>Other JavaScript Runtimes (NestJS, Remix, Astro, Koa)</H3>
        <P>
          For any Node.js, Bun, or edge JavaScript application, you do not need dedicated framework
          middleware. Simply importing <IC>@webwatch/sdk</IC> once at your application root
          automatically sets up process-level error listeners:
        </P>
        <CodeBlock
          file="main.ts"
          className="mb-6"
          code={`// Place at the very top of your application entrypoint
import "@webwatch/sdk";

// NestJS example:
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();`}
        />

        <Callout tone="brand" title="In-Memory Queue & Resiliency" icon={CheckCircle2}>
          The SDK buffers events in memory (up to 1,000 entries) and flushes in batches of 50 events
          or every 5 seconds. Failed network requests are retried up to 3 times with exponential
          backoff. Duplicate errors within a 5-second interval are throttled to prevent cascading
          alert storms.
        </Callout>
      </>
    ),
  },
  {
    id: "docker-monorepo",
    title: "Docker & Monorepo Deployments",
    icon: Container,
    content: (
      <>
        <P>
          Modern applications frequently ship inside containerized environments (Docker, Kubernetes)
          or are organized across multi-package monorepos (Turborepo, Nx, pnpm workspaces). WebWatch
          requires zero system-level agents, daemons, or volume mounts, making it completely
          plug-and-play across container boundaries.
        </P>

        <H3>Docker & Container Deployments</H3>
        <P>
          WebWatch requires no container agents, daemon processes, or sidecar containers. Simply
          pass your site API key and WebWatch URL as environment variables to your container:
        </P>
        <CodeBlock
          file="docker-compose.yml"
          className="mb-4"
          code={`services:
  backend-api:
    build: .
    environment:
      - NODE_ENV=production
      - WEBWATCH_KEY=ww_your_site_api_key
      - WEBWATCH_URL=https://your-webwatch-instance.com
    ports:
      - "3000:3000"`}
        />
        <CodeBlock
          file="Dockerfile"
          className="mb-6"
          code={`FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Environment variables are supplied at runtime via docker run -e or docker-compose
CMD ["node", "dist/index.js"]`}
        />

        <H3>Monorepo Architecture (Turborepo, Nx, pnpm workspaces)</H3>
        <P>
          In a monorepo setup with multiple applications (such as <IC>apps/web</IC> and{" "}
          <IC>apps/api</IC>), you can choose between two isolation models:
        </P>
        <UL>
          <li>
            <strong className="text-foreground">Isolated Sites (Recommended):</strong> Create a
            dedicated site entry for each service in the WebWatch dashboard. Each service receives
            its own API key (<IC>ww_api_...</IC> vs <IC>ww_web_...</IC>), keeping Telegram error
            alerts and exception logs cleanly partitioned.
          </li>
          <li>
            <strong className="text-foreground">Unified Project:</strong> Share one API key across
            all services in the workspace and differentiate them via the <IC>environment</IC> tag
            (e.g., <IC>production-web</IC>, <IC>production-api</IC>).
          </li>
        </UL>

        <Callout tone="info" title="Verifying Headless APIs in Docker or Monorepos" icon={Info}>
          If your backend container or microservice does not serve static files from a document
          root, simply expose a lightweight 1-line route to serve your verification token:
          <CodeBlock
            className="mt-3"
            code={`// Express.js
app.get("/webwatch-verify.txt", (req, res) => res.send("your_verification_token"));

// Hono
app.get("/webwatch-verify.txt", (c) => c.text("your_verification_token"));

// Fastify
fastify.get("/webwatch-verify.txt", async () => "your_verification_token");`}
          />
        </Callout>
      </>
    ),
  },
  {
    id: "sdk-frontend",
    title: "Frontend: Browser Monitoring",
    icon: Code,
    content: (
      <>
        <P>
          For client-side web applications, WebWatch offers two distribution channels: using the npm
          package in bundled setups (Vite, Webpack, Next.js), or including the zero-install CDN ES
          module directly.
        </P>

        <H3>Option A: Standalone CDN Script (Zero-Install)</H3>
        <P>
          Serve the SDK directly from your own WebWatch deployment without any third-party
          dependencies:
        </P>
        <CodeBlock
          file="index.html"
          className="mb-6"
          code={`<script type="module">
  import { WebWatch } from "https://your-webwatch-instance.com/api/public/sdk";

  WebWatch.init("ww_your_site_api_key", "https://your-webwatch-instance.com/api/ingest");
</script>`}
        />

        <H3>Option B: Bundled Webpack / Vite App</H3>
        <CodeBlock
          file="src/main.ts"
          className="mb-6"
          code={`import { init } from "@webwatch/sdk";

init("ww_your_site_api_key", {
  endpoint: "https://your-webwatch-instance.com/api/ingest",
});`}
        />

        <H3>Automatically Captured Browser Events</H3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Source</TableHead>
              <TableHead>event_type</TableHead>
              <TableHead>Payload Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <IC>window.onerror</IC>
              </TableCell>
              <TableCell>
                <Badge variant="danger" className="font-mono text-xs">
                  frontend_error
                </Badge>
              </TableCell>
              <TableCell>
                Error message, file source, line/column, stack trace, current URL
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>unhandledrejection</IC>
              </TableCell>
              <TableCell>
                <Badge variant="warning" className="font-mono text-xs">
                  backend_error / frontend_promise_error
                </Badge>
              </TableCell>
              <TableCell>
                Rejected promise reason, stack trace, active page URL (sent as{" "}
                <IC>frontend_promise_error</IC> in standalone CDN SDK or <IC>backend_error</IC> in{" "}
                <IC>@webwatch/sdk</IC>)
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <H3>Sensitive Data Scrubbing</H3>
        <P>
          Before transmitting error reports from the browser, the SDK automatically sanitizes
          sensitive query parameters (such as <IC>password</IC>, <IC>token</IC>, <IC>api_key</IC>,
          and <IC>auth</IC>) from URL strings, replacing them with <IC>[REDACTED]</IC>.
        </P>
      </>
    ),
  },
  {
    id: "rest-api",
    title: "Ingestion REST API Reference",
    icon: Database,
    content: (
      <>
        <P>
          If you are integrating applications in Python, Go, Rust, Ruby, or shell scripts, you can
          post error events directly to the HTTP ingestion endpoint.
        </P>

        <div className="panel mb-8 overflow-hidden">
          <div className="border-b border-border bg-muted/60 px-4 py-3">
            <h4 className="font-mono text-sm font-semibold text-foreground">
              POST{" "}
              <span className="ml-2 font-normal text-muted-foreground">
                https://your-webwatch-instance.com/api/ingest
              </span>
            </h4>
          </div>
          <div className="space-y-6 px-4 py-4">
            <div>
              <h5 className="mb-2 text-sm font-semibold text-foreground">Authorization Header</h5>
              <CodeBlock className="mb-2" code={`Authorization: Bearer ww_your_site_api_key`} />
              <p className="text-sm text-muted-foreground">
                Pass your 48-character hexadecimal site API key preceded by the <IC>ww_</IC> prefix.
              </p>
            </div>

            <div>
              <h5 className="mb-2 text-sm font-semibold text-foreground">Request Body (JSON)</h5>
              <CodeBlock
                code={`{
  "events": [
    {
      "type": "backend_error",
      "message": "Connection to PostgreSQL primary failed",
      "environment": "production",
      "stack_trace": "Error: connect ECONNREFUSED 10.0.0.4:5432\\n    at TCPConnectWrap.afterConnect",
      "url": "/api/v1/orders",
      "method": "POST",
      "user_agent": "checkout-service/2.4.0 (linux-arm64)"
    }
  ]
}`}
              />
            </div>
          </div>
        </div>

        <H3>Field Reference</H3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <IC>events</IC>
              </TableCell>
              <TableCell>Array</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>Array of error event objects (1 to 50 items per batch).</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>events[].type</IC>
              </TableCell>
              <TableCell>String</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>
                Event classifier (e.g., <IC>backend_error</IC>, <IC>frontend_error</IC>,{" "}
                <IC>database_error</IC>).
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>events[].message</IC>
              </TableCell>
              <TableCell>String</TableCell>
              <TableCell>Yes</TableCell>
              <TableCell>The primary error or exception message.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>events[].environment</IC>
              </TableCell>
              <TableCell>String</TableCell>
              <TableCell>No</TableCell>
              <TableCell>
                Environment identifier (defaults to <IC>production</IC>).
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>events[].stack_trace</IC>
              </TableCell>
              <TableCell>String</TableCell>
              <TableCell>No</TableCell>
              <TableCell>Full stack trace string.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>events[].url</IC>
              </TableCell>
              <TableCell>String</TableCell>
              <TableCell>No</TableCell>
              <TableCell>Path or URL where the error occurred.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>events[].method</IC>
              </TableCell>
              <TableCell>String</TableCell>
              <TableCell>No</TableCell>
              <TableCell>HTTP verb (GET, POST, PUT, DELETE, etc.).</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <H3>API Responses & Error Codes</H3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>HTTP Status</TableHead>
              <TableHead>Response Body</TableHead>
              <TableHead>Cause</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <IC>200 OK</IC>
              </TableCell>
              <TableCell>
                <IC>{'{"ok": true, "ingested": 1}'}</IC>
              </TableCell>
              <TableCell>Events accepted and persisted to Cloudflare D1.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>401 Unauthorized</IC>
              </TableCell>
              <TableCell>
                <IC>{'{"error": "missing_token"}'}</IC>
              </TableCell>
              <TableCell>Missing or malformed Authorization header.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>401 Unauthorized</IC>
              </TableCell>
              <TableCell>
                <IC>{'{"error": "invalid_key"}'}</IC>
              </TableCell>
              <TableCell>API key was not found or belongs to an unrecognized site.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>403 Forbidden</IC>
              </TableCell>
              <TableCell>
                <IC>{'{"error": "site_not_verified"}'}</IC>
              </TableCell>
              <TableCell>
                The site has not yet verified domain ownership via webwatch-verify.txt.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>400 Bad Request</IC>
              </TableCell>
              <TableCell>
                <IC>{'{"error": "invalid_payload"}'}</IC>
              </TableCell>
              <TableCell>Payload is not valid JSON or events array is malformed.</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <H3>Code Examples</H3>
        <div className="space-y-6">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">cURL</h4>
            <CodeBlock
              file="terminal"
              code={`curl -X POST https://your-webwatch-instance.com/api/ingest \\
  -H "Authorization: Bearer ww_your_site_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "events": [
      {
        "type": "backend_error",
        "message": "Upstream service timeout",
        "environment": "production"
      }
    ]
  }'`}
            />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Python</h4>
            <CodeBlock
              file="telemetry.py"
              code={`import requests

def report_error(err_type, message, stack=""):
    url = "https://your-webwatch-instance.com/api/ingest"
    headers = {
        "Authorization": "Bearer ww_your_site_api_key",
        "Content-Type": "application/json"
    }
    payload = {
        "events": [{
            "type": err_type,
            "message": message,
            "stack_trace": stack,
            "environment": "production"
        }]
    }
    requests.post(url, json=payload, headers=headers, timeout=5)`}
            />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Go</h4>
            <CodeBlock
              file="telemetry.go"
              code={`package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"
)

type Event struct {
	Type        string \`json:"type"\`
	Message     string \`json:"message"\`
	Environment string \`json:"environment"\`
}

func reportError(errMsg string) {
	payload, _ := json.Marshal(map[string]interface{}{
		"events": []Event{{Type: "backend_error", Message: errMsg, Environment: "production"}},
	})
	req, _ := http.NewRequest("POST", "https://your-webwatch-instance.com/api/ingest", bytes.NewBuffer(payload))
	req.Header.Set("Authorization", "Bearer ww_your_site_api_key")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	client.Do(req)
}`}
            />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">PHP (Laravel / Symfony)</h4>
            <CodeBlock
              file="app/Exceptions/Handler.php"
              code={`use Illuminate\\Support\\Facades\\Http;

// In your Laravel exception handler or middleware
Http::withToken('ww_your_site_api_key')
    ->timeout(5)
    ->post('https://your-webwatch-instance.com/api/ingest', [
        'events' => [
            [
                'type' => 'backend_error',
                'message' => $exception->getMessage(),
                'stack_trace' => $exception->getTraceAsString(),
                'environment' => config('app.env', 'production'),
                'url' => request()->fullUrl(),
                'method' => request()->method(),
            ]
        ]
    ]);`}
            />
          </div>
        </div>
      </>
    ),
  },
  {
    id: "alerting",
    title: "Telegram Alerting & Notifications",
    icon: Bell,
    content: (
      <>
        <P>
          WebWatch leverages Telegram as its primary alerting delivery vehicle. Critical runtime
          crashes trigger immediate push alerts with HTML formatting, environment badges, and stack
          trace snippets.
        </P>

        <H3>Linking Your Telegram Account</H3>
        <OL>
          <li>
            Visit the{" "}
            <Link to="/auth" className="font-semibold text-primary underline">
              /auth
            </Link>{" "}
            page.
          </li>
          <li>
            Click the <IC>Connect Telegram</IC> link, which opens a direct conversation with your
            bot:
            <IC>https://t.me/your_bot?start=&lt;token&gt;</IC>.
          </li>
          <li>
            Tap <IC>Start</IC> in Telegram. Your chat ID is automatically paired with your account.
          </li>
        </OL>

        <H3>Telegram Bot Commands</H3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Command</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <IC>/start [token]</IC>
              </TableCell>
              <TableCell>Links Telegram chat or initiates the bot session.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>/help</IC>
              </TableCell>
              <TableCell>Displays available commands and platform help.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>/addsite &lt;url&gt;</IC>
              </TableCell>
              <TableCell>Quickly registers a new site directly from Telegram.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>/listsite</IC>
              </TableCell>
              <TableCell>Lists all registered sites, status, and IDs.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>/removesite &lt;id&gt;</IC>
              </TableCell>
              <TableCell>Removes a site by full ID or 8-character prefix.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>/pause &lt;id&gt;</IC>
              </TableCell>
              <TableCell>Temporarily pauses APM telemetry collection for a site.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>/resume &lt;id&gt;</IC>
              </TableCell>
              <TableCell>Resumes APM telemetry collection for a site.</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Callout tone="warning" title="Anti-Storm Suppression" icon={AlertTriangle}>
          To protect on-call engineers from alert fatigue during cascading failures, identical error
          events (matching message and error type) are throttled across a 5-second suppression
          window.
        </Callout>
      </>
    ),
  },
  {
    id: "security",
    title: "Security & Data Privacy",
    icon: ShieldAlert,
    content: (
      <>
        <P>
          WebWatch is designed from the ground up to respect data isolation and minimal privilege
          principles.
        </P>

        <H3>Edge-Isolated Execution</H3>
        <P>
          All request processing takes place in isolated V8 Worker isolates across Cloudflare's
          global network. There are no long-lived servers, no shared filesystem memory, and no
          persistent internal containers that can be compromised across tenants.
        </P>

        <H3>Passwordless Authentication</H3>
        <P>
          WebWatch completely avoids static passwords. Login codes (6-digit OTPs) are hashed with
          SHA-256 before storage, expire within 5 minutes, enforce a maximum of 5 attempts, and
          require an active Telegram handshake. Sessions are secured via <IC>HttpOnly</IC>,{" "}
          <IC>SameSite=Lax</IC>, and <IC>Secure</IC> cookies.
        </P>

        <H3>Data Processor Guidance</H3>
        <P>
          WebWatch functions strictly as a Data Processor. We advise engineering teams never to
          transmit unencrypted Personally Identifiable Information (PII) such as passwords, credit
          card numbers, or social security identifiers in stack traces or error messages. Use
          anonymized identifiers and scrub sensitive headers before reporting.
        </P>
      </>
    ),
  },
];

const NAV_GROUPS = [
  { label: "Getting Started", ids: ["prolog", "getting-started"] },
  {
    label: "Integrations & Frameworks",
    ids: ["backend-nodejs", "sdk-frontend", "docker-monorepo", "rest-api"],
  },
  { label: "Platform", ids: ["alerting", "security"] },
];

const SECTION_BY_ID = new Map(DOCS_SECTIONS.map((section) => [section.id, section]));
const FIRST_SECTION_ID = DOCS_SECTIONS[0]?.id ?? "prolog";

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

function DocsPage() {
  const [activeSection, setActiveSection] = useState(FIRST_SECTION_ID);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const threshold = 160;
      let current = FIRST_SECTION_ID;

      for (const section of DOCS_SECTIONS) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= threshold) {
          current = section.id;
        }
      }

      setActiveSection((previous) => (previous === current ? previous : current));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;

    const top = element.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
    window.history.replaceState(null, "", `#${id}`);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-wide items-center gap-4 px-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-11 w-11 md:hidden"
            aria-label={isSidebarOpen ? "Close table of contents" : "Open table of contents"}
            aria-expanded={isSidebarOpen}
            onClick={() => setIsSidebarOpen((open) => !open)}
          >
            {isSidebarOpen ? <X /> : <Menu />}
          </Button>

          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link to="/dashboard">
              <ArrowLeft />
              Dashboard
            </Link>
          </Button>

          <div className="hidden h-4 w-px bg-border md:block" />

          <Link to="/" className="flex items-center gap-2 font-display text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>
              WebWatch <span className="ml-1 font-normal text-muted-foreground">Docs</span>
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
            <a
              href="https://github.com/hsanmz/webwatch"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              GitHub
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Link to="/status" className="transition-colors hover:text-foreground">
              API Status
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative mx-auto flex w-full max-w-wide flex-1">
        <aside
          className={cn(
            "fixed top-14 left-0 z-30 h-[calc(100vh-3.5rem)] w-72 overflow-y-auto border-r border-border bg-surface transition-transform duration-[var(--motion-slow)] md:sticky md:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
          inert={!isDesktop && !isSidebarOpen}
        >
          <nav className="p-6 pb-24">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-8 last:mb-0">
                <h2 className="mb-3 ml-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </h2>
                <ul className="space-y-1">
                  {group.ids.map((id) => {
                    const section = SECTION_BY_ID.get(id);
                    if (!section) return null;
                    const isActive = activeSection === id;

                    return (
                      <li key={id}>
                        <a
                          href={`#${id}`}
                          aria-current={isActive ? "true" : undefined}
                          onClick={(event) => {
                            event.preventDefault();
                            scrollToSection(id);
                          }}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-[var(--motion-fast)]",
                            isActive
                              ? "bg-primary-subtle text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <section.icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isActive ? "text-primary" : "text-muted-foreground",
                            )}
                            aria-hidden="true"
                          />
                          <span className="truncate">{section.title}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <div className="border-t border-border pt-6">
              <a
                href="https://github.com/hsanmz/webwatch/issues"
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-info-surface text-info">
                  <Terminal className="h-3 w-3" />
                </span>
                Support & Issues
              </a>
            </div>
          </nav>
        </aside>

        {isSidebarOpen ? (
          <button
            type="button"
            aria-label="Close table of contents"
            className="fixed inset-0 z-20 cursor-default bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-content px-6 py-12 md:px-10">
            <div className="mb-16">
              <h1 className="mb-5 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
                WebWatch APM Documentation
              </h1>
              <p className="max-w-reading text-lg font-medium leading-relaxed text-muted-foreground md:text-xl">
                Complete guide to integrating SDKs, configuring framework middleware, posting to the
                ingestion REST API, and receiving Telegram error alerts.
              </p>
            </div>

            <div className="space-y-24 pb-16">
              {DOCS_SECTIONS.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <div className="mb-8 flex items-center gap-4 border-b border-border pb-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary-subtle text-primary">
                      <section.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                      {section.title}
                    </h2>
                  </div>
                  {section.content}
                </section>
              ))}
            </div>

            <div className="flex flex-col items-center justify-between gap-4 border-t border-border py-8 text-center md:flex-row md:text-left">
              <p className="text-sm text-muted-foreground">© 2026 WebWatch APM</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Back to top
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
