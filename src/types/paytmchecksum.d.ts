declare module 'paytmchecksum' {
  export default class PaytmChecksum {
    static generateSignature(params: string | Record<string, string>, key: string): Promise<string>;
    static verifySignature(params: string | Record<string, string>, key: string, signature: string): boolean;
  }
}
