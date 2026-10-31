import {describe,it,expect} from 'vitest';
import {validateSecurityConfiguration,getTrustProxy} from '../config/security.js';
describe('production configuration',()=>{
  const valid={NODE_ENV:'production',JWT_SECRET:'a'.repeat(40),CSRF_SECRET:'b'.repeat(40),CLIENT_URL:'https://shop.example.com',ADMIN_URL:'https://admin.example.com'};
  it('accepts distinct strong secrets and exact HTTPS origins',()=>expect(()=>validateSecurityConfiguration(valid)).not.toThrow());
  it('rejects disabled TLS checks, weak/reused secrets, and ambiguous origins',()=>{
    for(const bad of [{NODE_TLS_REJECT_UNAUTHORIZED:'0'},{JWT_SECRET:'short'},{CSRF_SECRET:'short'},{CSRF_SECRET:valid.JWT_SECRET},{CLIENT_URL:'http://shop.example.com'},{ADMIN_URL:'https://admin.example.com/path'}])expect(()=>validateSecurityConfiguration({...valid,...bad})).toThrow();
  });
  it('does not accept a blanket trusted-proxy flag',()=>{expect(()=>getTrustProxy('true')).toThrow();expect(getTrustProxy('false')).toBe(false);});
});
