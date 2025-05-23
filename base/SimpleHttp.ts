import * as pako from 'pako';
import { TextCodec } from './TextCodec';

export class SimpleHttp {
    public static instance = new SimpleHttp();

    private constructor() { }

/**
     *  JSON POST 
     * @param url 
     * @param data 
     * @param headers 
     * @param timeout () 5000ms
     * @returns  null
     */
    postDataWithTimeout<T = any>(
      url: string,
      data: object,
      headers: Record<string, string> = {},
      timeout: number = 5000
    ): Promise<T | null> {
      return new Promise((resolve) => {
          const xhr = new XMLHttpRequest();
          let isTimeout = false;

          // 
          const timeoutId = setTimeout(() => {
              isTimeout = true;
              xhr.abort();
              console.error('');
              resolve(null);
          }, timeout);

          xhr.open('POST', url, true);

          // 
          xhr.setRequestHeader('Content-Type', 'application/json');
          for (const [key, value] of Object.entries(headers)) {
              xhr.setRequestHeader(key, value);
          }

          xhr.onload = () => {
              if (isTimeout) return;
              clearTimeout(timeoutId);

              if (xhr.status >= 200 && xhr.status < 300) {
                  try {
                      const response = JSON.parse(xhr.responseText) as T;
                      resolve(response);
                  } catch (e) {
                      console.error(':', e);
                      resolve(null);
                  }
              } else {
                  console.error(`HTTP error! status: ${xhr.status}`);
                  resolve(null);
              }
          };

          xhr.onerror = () => {
              if (isTimeout) return;
              clearTimeout(timeoutId);
              console.error('');
              resolve(null);
          };

          xhr.ontimeout = () => {
              clearTimeout(timeoutId);
              console.error('');
              resolve(null);
          };

          try {
              xhr.send(JSON.stringify(data));
          } catch (e) {
              clearTimeout(timeoutId);
              console.error(':', e);
              resolve(null);
          }
      });
    }
}