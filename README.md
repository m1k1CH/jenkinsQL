# GraphQL Generator

Web app that converts GraphQL introspection responses into friendly requests.

## Features

- Copy full introspection query
- Paste introspection JSON response
- Parse schema using graphql
- Generate query, mutation, subscription templates
- Export GraphQL document
- Export JSON body
- Export raw HTTP POST request
- Export raw HTTP GET request

## Run locally
npm install &&
npm run dev

`npm run build` now auto-runs dependency install (`npm ci`) if `node_modules` is missing.

## Docker
sudo docker compose build && 
sudo docker compose up
