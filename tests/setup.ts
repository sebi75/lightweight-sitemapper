import { mock } from "bun:test";

//@ts-ignore
global.fetch = mock(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(Buffer.from("<xml></xml>")),
    json: () => Promise.resolve({ data: "sample data" }),
  })
);
