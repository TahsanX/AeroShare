import { createHash, randomBytes } from "node:crypto";

export const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");
export const randomFile = (size: number) => randomBytes(size);
