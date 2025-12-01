declare module 'pem-jwk' {
  export function pem2jwk(pem: string): any;
  export function jwk2pem(jwk: any): string;
}

