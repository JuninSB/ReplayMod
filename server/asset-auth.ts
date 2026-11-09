import { promises as fs } from "node:fs";
import { constants } from "node:fs";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";

type Vault = {
  version: 1;
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
};
export type UnlockedVault = { vault: Vault; key: Buffer };

function cookieValue(raw: string): string | null {
  const value = raw.trim().replace(/^\.ROBLOSECURITY\s*=\s*/, "");
  return !value || value.length > 8192 || /[\s;\x00-\x1f\x7f]/.test(value)
    ? null
    : value;
}
function keyFor(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
}
function parseVault(raw: string): Vault {
  if (raw.length > 20000) throw new Error("Invalid credentials file");
  const v = JSON.parse(raw);
  if (
    !v ||
    v.version !== 1 ||
    typeof v.salt !== "string" ||
    typeof v.iv !== "string" ||
    typeof v.tag !== "string" ||
    typeof v.ciphertext !== "string" ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(v.salt) ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(v.iv) ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(v.tag) ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(v.ciphertext) ||
    Buffer.from(v.salt, "base64").length !== 16 ||
    Buffer.from(v.iv, "base64").length !== 12 ||
    Buffer.from(v.tag, "base64").length !== 16 ||
    Buffer.from(v.ciphertext, "base64").length > 8192
  )
    throw new Error("Invalid credentials file");
  return v as Vault;
}
export function createVault(raw: string, password: string): UnlockedVault {
  const cookie = cookieValue(raw);
  if (!cookie) throw new Error("Invalid Roblox credential");
  if (password.length < 6)
    throw new Error("Password must contain at least 6 characters");
  const salt = randomBytes(16),
    iv = randomBytes(12),
    key = keyFor(password, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(cookie, "utf8"),
    cipher.final(),
  ]);
  return {
    vault: {
      version: 1,
      salt: salt.toString("base64"),
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    },
    key,
  };
}
export function decryptVault(unlocked: UnlockedVault): string {
  const v = unlocked.vault;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    unlocked.key,
    Buffer.from(v.iv, "base64"),
    { authTagLength: 16 },
  );
  decipher.setAuthTag(Buffer.from(v.tag, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(v.ciphertext, "base64")),
    decipher.final(),
  ]);
  try {
    const value = cookieValue(plain.toString("utf8"));
    if (!value) throw new Error("Invalid Roblox credential");
    return value;
  } finally {
    plain.fill(0);
  }
}
export function unlockVault(raw: string, password: string): UnlockedVault {
  const vault = parseVault(raw);
  const key = keyFor(password, Buffer.from(vault.salt, "base64"));
  const unlocked = { vault, key };
  try {
    decryptVault(unlocked);
    return unlocked;
  } catch (error) {
    key.fill(0);
    throw error;
  }
}

export async function initializeCredential(
  file: string,
): Promise<UnlockedVault | null> {
  let raw: string | null = null;
  let invalidFile = false;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      throw new Error("Credential file is inaccessible; it was not changed.");
  }
  if (raw !== null) {
    try {
      parseVault(raw);
    } catch {
      invalidFile = true;
      raw = null;
    }
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    if (invalidFile)
      throw new Error(
        "Credential file is invalid and requires an interactive terminal.",
      );
    if (raw !== null)
      throw new Error("A terminal is required to unlock auth.lzk8.");
    console.log(
      "[Replay Mod] No credentials file; starting without Roblox session (no interactive terminal).",
    );
    return null;
  }
  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = createInterface({
    input: process.stdin,
    output,
    terminal: true,
    historySize: 0,
  });
  const ask = (question: string, secret = false) =>
    new Promise<string>((resolve, reject) => {
      if (secret) process.stdout.write(question);
      muted = secret;
      let finished = false;
      rl.once("close", () => {
        if (!finished) reject(new Error("Input cancelled"));
      });
      rl.question(secret ? "" : question, (answer) => {
        finished = true;
        muted = false;
        if (secret) process.stdout.write("\n");
        resolve(answer);
      });
    });
  try {
    if (raw !== null) {
      const password = await ask("Password for auth.lzk8: ", true);
      try {
        return unlockVault(raw, password);
      } catch {
        throw new Error(
          "Incorrect password or damaged credentials file; it was not changed.",
        );
      }
    }
    const choice = (
      await ask("No valid credentials file found. Create auth.lzk8? [y/N] ")
    )
      .trim()
      .toLowerCase();
    if (!["y", "yes", "s", "sim"].includes(choice)) return null;
    const cookie = await ask("Paste .ROBLOSECURITY: ", true);
    if (!cookieValue(cookie))
      throw new Error("Invalid Roblox credential; no file was created.");
    const password = await ask(
      "Choose a password (at least 6 characters): ",
      true,
    );
    if (password.length < 6)
      throw new Error(
        "Password must contain at least 6 characters; no file was created.",
      );
    const repeat = await ask("Confirm password: ", true);
    if (password !== repeat)
      throw new Error("Passwords do not match; no file was created.");
    const confirmed = (
      await ask(
        "If you forget the password, the file must be recreated. Continue? [y/N] ",
      )
    )
      .trim()
      .toLowerCase();
    if (!["y", "yes", "s", "sim"].includes(confirmed)) return null;
    const unlocked = createVault(cookie, password);
    try {
      if (invalidFile) {
        const backup = `${file}.invalid-${randomBytes(8).toString("hex")}`;
        await fs.copyFile(file, backup, constants.COPYFILE_EXCL);
        await fs.unlink(file);
        console.log(`[Replay Mod] Invalid file preserved as ${backup}`);
      }
      await fs.writeFile(file, JSON.stringify(unlocked.vault), {
        mode: 0o600,
        flag: "wx",
      });
    } catch (error) {
      unlocked.key.fill(0);
      throw error;
    }
    console.log("[Replay Mod] Encrypted credentials created.");
    return unlocked;
  } finally {
    rl.close();
  }
}
