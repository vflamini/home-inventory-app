declare global {
  namespace App {
    interface Locals {
      user?: {
        userId: number;
        username: string;
      };
    }
    interface PageData {
      user?: {
        userId: number;
        username: string;
      };
    }
  }
}

export {};