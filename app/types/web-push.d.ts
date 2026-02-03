declare module "web-push" {
  /**
   * VAPID Details for Web Push.
   */
  export interface VapidDetails {
    subject: string;
    publicKey: string;
    privateKey: string;
  }

  /**
   * Options object for sendNotification.
   */
  export interface PushOptions {
    TTL?: number;
    vapidDetails?: VapidDetails;
    headers?: { [key: string]: string };
    contentEncoding?: string;
    urgency?: "very-low" | "low" | "normal" | "high";
  }

  /**
   * PushSubscription as defined by W3C.
   */
  export interface PushSubscriptionKeys {
    p256dh: string;
    auth: string;
  }

  export interface PushSubscription {
    endpoint: string;
    expirationTime: number | null;
    keys: PushSubscriptionKeys;
  }

  /**
   * Main exported object.
   */
  interface WebPush {
    /**
     * Configure VAPID details.
     */
    setVapidDetails(
      subject: string,
      publicKey: string,
      privateKey: string,
    ): void;

    /**
     * Generate VAPID keys (public + private).
     */
    generateVAPIDKeys(): { publicKey: string; privateKey: string };

    /**
     * Send a push notification.
     */
    sendNotification(
      subscription: PushSubscription | any,
      payload?: string | Buffer,
      options?: PushOptions,
    ): Promise<any>;
  }

  const webpush: WebPush;
  export = webpush;
}
