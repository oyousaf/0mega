import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("====================================");
console.log("OMEGA VAPID KEYS");
console.log("====================================\n");

console.log("Public Key:");
console.log(keys.publicKey + "\n");

console.log("Private Key:");
console.log(keys.privateKey + "\n");

console.log("Add these to your .env file:");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
