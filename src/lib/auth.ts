import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "./prisma";
import { Role } from "./roles";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const DEFAULT_EXPIRES_IN = "24h";

export interface JwtPayload {
  userId: number;
  username: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface SignJwtInput {
  userId: number;
  username: string;
  role: Role;
}

export function signJwt(
  payload: SignJwtInput,
  options: SignOptions = {}
): string {
  const finalOptions: SignOptions = {
    expiresIn: DEFAULT_EXPIRES_IN,
    ...options,
  };

  return jwt.sign(payload, JWT_SECRET, finalOptions);
}

export async function verifyJwt(token: string): Promise<JwtPayload> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    if (!decoded?.userId || !decoded?.username) {
      throw new Error("Invalid token payload");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        username: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      userId: decoded.userId,
      username: user.username || decoded.username,
      role: user.role ?? decoded.role ?? Role.USER,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Invalid authentication token"
    );
  }
}

export async function revokeUserTokens(userId: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { token_revoked_at: new Date() },
  });
}

