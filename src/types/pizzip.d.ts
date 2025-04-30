declare module 'pizzip' {
  export default class PizZip {
    constructor(data: string | Buffer, options?: any);
    file(path: string): any;
    generate(options?: any): any;
  }
} 