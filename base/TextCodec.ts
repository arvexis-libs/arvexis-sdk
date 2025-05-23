/**
 * /
 *  TextEncoder  TextDecoder 
 *  Node.js 
 */
export class TextCodec {
  /**
   * 
   */
  static readonly supportedEncodings = [
    'utf-8',
    'utf-16le',
    'utf-16be',
    'ascii',
    'base64',
    'hex',
    'latin1'
  ] as const;

  /**
   * 
   */
  static readonly Encoding = {
    UTF8: 'utf-8',
    UTF16LE: 'utf-16le',
    UTF16BE: 'utf-16be',
    ASCII: 'ascii',
    BASE64: 'base64',
    HEX: 'hex',
    LATIN1: 'latin1'
  } as const;

  /**
   *  Uint8Array
   * @param text 
   * @param encoding  ( 'utf-8')
   * @returns  Uint8Array
   */
  static encode(
    text: string,
    encoding: typeof TextCodec.supportedEncodings[number] = TextCodec.Encoding.UTF8
  ): Uint8Array {
    // Node.js  Buffer
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(text, encoding);
    }

    //  TextEncoder ( UTF-8)
    if (typeof TextEncoder !== 'undefined' && encoding === TextCodec.Encoding.UTF8) {
      return new TextEncoder().encode(text);
    }

    //  -  UTF-8 
    if (encoding === TextCodec.Encoding.UTF8) {
      return TextCodec.utf8Encode(text);
    }

    throw new Error(`Encoding '${encoding}' is not supported in this environment`);
  }

  /**
   *  Uint8Array  Buffer 
   * @param data 
   * @param encoding  ( 'utf-8')
   * @returns 
   */
  static decode(
    data: Uint8Array | Buffer,
    encoding: typeof TextCodec.supportedEncodings[number] = TextCodec.Encoding.UTF8
  ): string {
    // Node.js  Buffer
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
      return data.toString();
    }

    //  Uint8Array
    if (data instanceof Uint8Array) {
      //  TextDecoder ( UTF-8, UTF-16)
      if (typeof TextDecoder !== 'undefined' && 
          (encoding === TextCodec.Encoding.UTF8 || 
           encoding === TextCodec.Encoding.UTF16LE || 
           encoding === TextCodec.Encoding.UTF16BE)) {
        return new TextDecoder(encoding).decode(data);
      }

      //  -  UTF-8 
      if (encoding === TextCodec.Encoding.UTF8) {
        return TextCodec.utf8Decode(data);
      }

      //  Uint8Array  Buffer ( polyfill )
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(data).toString(encoding);
      }
    }

    throw new Error(`Decoding with '${encoding}' is not supported in this environment`);
  }

    /**
   *  Uint8Array 
   * @param text 
   * @param destination  Uint8Array
   * @param encoding  ( 'utf-8')
   * @returns  { written, read }
   */
    static encodeInto(
      text: string,
      destination: Uint8Array,
      encoding: typeof TextCodec.supportedEncodings[number] = TextCodec.Encoding.UTF8
    ): { read: number; written: number } {
      //  TextEncoder.encodeInto ( UTF-8)
      if (typeof TextEncoder !== 'undefined' && encoding === TextCodec.Encoding.UTF8) {
        return (new TextEncoder()).encodeInto(text, destination);
      }
  
      // Node.js 
      const encoded = TextCodec.encode(text, encoding);
      const bytesToCopy = Math.min(encoded.length, destination.length);
      destination.set(encoded.subarray(0, bytesToCopy));
      
      return {
        read: text.length,
        written: bytesToCopy
      };
    }

  /**
   *  UTF-8 
   * @param text 
   * @returns  Uint8Array
   * @private
   */
  private static utf8Encode(text: string): Uint8Array {
    const bytes: number[] = [];
    for (let i = 0; i < text.length; i++) {
      let code = text.charCodeAt(i);
      
      if (code <= 0x7f) {
        bytes.push(code);
      } else if (code <= 0x7ff) {
        bytes.push(0xc0 | (code >> 6));
        bytes.push(0x80 | (code & 0x3f));
      } else if (code >= 0xd800 && code <= 0xdbff) {
        //  (surrogate pairs)
        if (i + 1 < text.length) {
          const nextCode = text.charCodeAt(i + 1);
          if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
            code = 0x10000 + ((code - 0xd800) << 10) + (nextCode - 0xdc00);
            i++;
            
            bytes.push(0xf0 | (code >> 18));
            bytes.push(0x80 | ((code >> 12) & 0x3f));
            bytes.push(0x80 | ((code >> 6) & 0x3f));
            bytes.push(0x80 | (code & 0x3f));
          }
        }
      } else {
        bytes.push(0xe0 | (code >> 12));
        bytes.push(0x80 | ((code >> 6) & 0x3f));
        bytes.push(0x80 | (code & 0x3f));
      }
    }
    return new Uint8Array(bytes);
  }

  /**
   *  UTF-8 
   * @param bytes  Uint8Array
   * @returns 
   * @private
   */
  private static utf8Decode(bytes: Uint8Array): string {
    let result = '';
    let i = 0;
    
    while (i < bytes.length) {
      const byte1 = bytes[i++];
      
      if (byte1 < 0x80) {
        // 1 
        result += String.fromCharCode(byte1);
      } else if (byte1 >= 0xc0 && byte1 < 0xe0) {
        // 2 
        const byte2 = bytes[i++] & 0x3f;
        result += String.fromCharCode(((byte1 & 0x1f) << 6) | byte2);
      } else if (byte1 >= 0xe0 && byte1 < 0xf0) {
        // 3 
        const byte2 = bytes[i++] & 0x3f;
        const byte3 = bytes[i++] & 0x3f;
        result += String.fromCharCode(((byte1 & 0x0f) << 12) | (byte2 << 6) | byte3);
      } else if (byte1 >= 0xf0) {
        // 4  ()
        const byte2 = bytes[i++] & 0x3f;
        const byte3 = bytes[i++] & 0x3f;
        const byte4 = bytes[i++] & 0x3f;
        const codepoint = ((byte1 & 0x07) << 18) | (byte2 << 12) | (byte3 << 6) | byte4;
        
        // 
        result += String.fromCharCode(
          0xd800 + ((codepoint - 0x10000) >> 10),
          0xdc00 + ((codepoint - 0x10000) & 0x3ff)
        );
      }
    }
    
    return result;
  }
}