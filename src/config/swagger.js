import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';
import env from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const authDocsPath = path.join(__dirname, '../docs/swagger/auth.swagger.js').replace(/\\/g, '/');
const adminDocsPath = path.join(__dirname, '../docs/swagger/admin/*.swagger.js').replace(/\\/g, '/');
const customerDocsPath = path.join(__dirname, '../docs/swagger/customer/*.swagger.js').replace(/\\/g, '/');

// 👑 1. ADMIN SWAGGER SPECIFICATION
const adminOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Insurance Management System — Admin Portal API',
      version: '1.0.0',
      description:
        'Dedicated API Documentation for Admin Portal & Master Data Management (Plans, Rate Cards, Policy Wording, Excel Upload, Application Review & Policy Issuance).',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Local Development Server',
      },
      {
        url: 'https://web-production-63f48.up.railway.app',
        description: 'Production Server (Railway)',
      },
    ],
    tags: [
      { name: 'Auth', description: '🔐 Common Authentication & Session APIs' },
      { name: 'Policy Applications Management', description: '👑 Review, Approve, Reject & Issue Customer Policies' },
      { name: 'Insurance Plans', description: '👑 Insurance Plans Master' },
      { name: 'Plan Options', description: '👑 Plan Options Master' },
      { name: 'Coverage Master', description: '👑 Reusable Insurance Coverages Master' },
      { name: 'Sum Insured Master', description: '👑 Sum Insured Slabs Master' },
      { name: 'Age Slab Master', description: '👑 Age Bracket Slabs Master' },
      { name: 'Family Type Master', description: '👑 Family Composition Types Master' },
      { name: 'Plan Option Coverages', description: '👑 Coverage Matrix Mapping per Option' },
      { name: 'Premium Rate Matrix', description: '👑 Premium Rate Card & Excel Bulk Upload' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'Secure httpOnly access token cookie required for protected endpoints',
        },
      },
    },
  },
  apis: [authDocsPath, adminDocsPath],
};

// 📱 2. CUSTOMER MOBILE APP SWAGGER SPECIFICATION
const customerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Insurance Management System — Customer Mobile App API',
      version: '1.0.0',
      description:
        'Dedicated API Documentation for Customer Mobile App (Dashboard, Dynamic Quote Engine, Apply for Insurance, Track Applications, KYC, My Policies).',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Local Development Server',
      },
      {
        url: 'https://web-production-63f48.up.railway.app',
        description: 'Production Server (Railway)',
      },
    ],
    tags: [
      { name: 'Auth', description: '🔐 Common Authentication & Session APIs' },
      { name: 'Customer Mobile App - Home & Explore', description: '📱 Mobile Dashboard & Dynamic Quote Engine' },
      { name: 'Customer Mobile App - KYC & Profile', description: '📱 Profile & KYC Document Verification' },
      { name: 'Customer Mobile App - Proposals & My Policies', description: '📱 Apply for Policy, Track Application & My Active Policies' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'Secure httpOnly access token cookie required for protected endpoints',
        },
      },
    },
  },
  apis: [authDocsPath, customerDocsPath],
};

const adminSwaggerSpec = swaggerJSDoc(adminOptions);
const customerSwaggerSpec = swaggerJSDoc(customerOptions);

export const setupSwagger = (app) => {
  // Raw JSON specs
  app.get('/api-docs/admin.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(adminSwaggerSpec);
  });

  app.get('/api-docs/customer.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(customerSwaggerSpec);
  });

  // Custom JS Script to inject prominent <select> dropdown tag directly into Swagger UI Header
  const customJs = `
    window.addEventListener('load', function() {
      var checkInterval = setInterval(function() {
        var infoElem = document.querySelector('.swagger-ui .info');
        if (infoElem && !document.getElementById('api-role-selector-container')) {
          clearInterval(checkInterval);
          var isCustomer = window.location.pathname.includes('/customer');
          
          var container = document.createElement('div');
          container.id = 'api-role-selector-container';
          container.style.cssText = 'margin: 15px 0 25px 0; display: flex; align-items: center; gap: 12px; background: #1e293b; padding: 12px 20px; border-radius: 10px; border: 2px solid #38bdf8; width: fit-content; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';

          var label = document.createElement('label');
          label.style.cssText = 'color: #f8fafc; font-weight: bold; font-size: 15px; font-family: sans-serif;';
          label.innerHTML = '🎯 Select API Module:';

          var select = document.createElement('select');
          select.id = 'api-role-selector';
          select.style.cssText = 'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 10px 18px; border: 1px solid #38bdf8; border-radius: 8px; font-size: 15px; cursor: pointer; outline: none; font-family: sans-serif;';

          var optAdmin = document.createElement('option');
          optAdmin.value = '/api-docs/admin';
          optAdmin.textContent = '👑 Admin';
          if (!isCustomer) optAdmin.selected = true;

          var optCustomer = document.createElement('option');
          optCustomer.value = '/api-docs/customer';
          optCustomer.textContent = '📱 Customer';
          if (isCustomer) optCustomer.selected = true;

          select.appendChild(optAdmin);
          select.appendChild(optCustomer);

          select.addEventListener('change', function(e) {
            window.location.href = e.target.value;
          });

          container.appendChild(label);
          container.appendChild(select);

          infoElem.parentNode.insertBefore(container, infoElem);
        }
      }, 200);
    });
  `;

  // Custom CSS for dark mode styling
  const customCss = `
    .swagger-ui { background-color: #0f172a; color: #f8fafc; }
    .swagger-ui .info .title { color: #38bdf8; }
    .swagger-ui .scheme-container { background: #1e293b; box-shadow: none; border-radius: 8px; }
  `;

  // 1. Admin Swagger UI (/api-docs/admin)
  app.use(
    '/api-docs/admin',
    swaggerUi.serveFiles(adminSwaggerSpec, {}),
    swaggerUi.setup(adminSwaggerSpec, {
      customSiteTitle: '👑 Admin Portal APIs',
      customJsStr: customJs,
      customCss,
    })
  );

  // 2. Customer Swagger UI (/api-docs/customer)
  app.use(
    '/api-docs/customer',
    swaggerUi.serveFiles(customerSwaggerSpec, {}),
    swaggerUi.setup(customerSwaggerSpec, {
      customSiteTitle: '📱 Customer Mobile App APIs',
      customJsStr: customJs,
      customCss,
    })
  );

  // Main /api-docs redirects directly to /api-docs/admin
  app.get('/api-docs', (req, res) => {
    res.redirect('/api-docs/admin');
  });
};
