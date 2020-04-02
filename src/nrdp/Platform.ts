import "./polyfills";
import DataBuffer from "./DataBuffer";
import ICreateSSLNetworkPipeOptions from "../ICreateSSLNetworkPipeOptions";
import ICreateTCPNetworkPipeOptions from "../ICreateTCPNetworkPipeOptions";
import IDataBuffer from "../IDataBuffer";
import IPipeResult from "../IPipeResult";
import IPlatform from "../IPlatform";
import IRequestData from "../IRequestData";
import IRequestTimeouts from "../IRequestTimeouts";
import ISHA256Context from "../ISHA256Context";
import N = nrdsocket;
import NrdpSSL from "./NrdpSSL";
import RequestResponse from "../RequestResponse";
import createNrdpSSLNetworkPipe from "./NrdpSSLNetworkPipe";
import createNrdpTCPNetworkPipe from "./NrdpTCPNetworkPipe";
import { IpConnectivityMode } from "../types";

type NrdpGibbonLoadCallbackSignature = (response: RequestResponse) => void;
type NrdpGibbonLoadSignature = (data: IRequestData | string, callback: NrdpGibbonLoadCallbackSignature) => number;
export class NrdpPlatform implements IPlatform {
    constructor() {
        this.scratch = new DataBuffer(16 * 1024);
        this.ssl = new NrdpSSL(this);
        this.realLoad = nrdp.gibbon.load;
    }

    sha1(input: string): Uint8Array { return nrdp.hash("sha1", input); }

    public readonly scratch: IDataBuffer;
    public readonly ssl: NrdpSSL;

    log(...args: any[]): void {
        args.unshift({ traceArea: "MILO" });
        nrdp.l.success.apply(nrdp.l, args);
    }
    error(...args: any[]): void {
        args.unshift({ traceArea: "MILO" });
        nrdp.l.error.apply(nrdp.l, args);
    }
    trace(...args: any[]): void {
        args.unshift({ traceArea: "MILO" });
        nrdp.l.trace.apply(nrdp.l, args);
    }

    get ipConnectivityMode(): IpConnectivityMode {
        switch (nrdp.device.ipConnectivityMode) {
        case "4":
            break;
        case "6":
            return 6;
        case "dual":
            return 10;
        case "invalid":
            return 0;
        }
        return 4;
    }

    get tlsv13SmallAssetsEnabled(): boolean {
        return nrdp.device.tlsv13SmallAssetsEnabled;
    }
    get tlsv13StreamingEnabled(): boolean {
        return nrdp.device.tlsv13StreamingEnabled;
    }

    private cachedStandardHeaders?: { [key: string]: string };
    private cachedUILanguages?: string[];
    get standardHeaders(): { [key: string]: string } {
        const currentLanguages = this.UILanguages;
        if (!this.cachedStandardHeaders || this.cachedUILanguages !== currentLanguages) {
            this.cachedUILanguages = currentLanguages;
            this.cachedStandardHeaders = {};
            this.cachedStandardHeaders["User-Agent"] = "Milo/0.1";
            this.cachedStandardHeaders.Accept = "*/*";
            if (currentLanguages && currentLanguages.length) {
                this.cachedStandardHeaders.Language = currentLanguages.join(",");
            }
        }
        return this.cachedStandardHeaders;
    }

    get defaultRequestTimeouts(): IRequestTimeouts {
        const opts = nrdp.options;
        return {
            timeout: opts.default_network_timeout,
            connectTimeout: opts.default_network_connect_timeout,
            dnsTimeout: opts.default_network_dns_timeout,
            dnsFallbackTimeoutWaitFor4: opts.default_network_dns_fallback_timeout_wait_for_4,
            dnsFallbackTimeoutWaitFor6: opts.default_network_dns_fallback_timeout_wait_for_6,
            happyEyeballsHeadStart: opts.default_network_happy_eyeballs_head_start,
            lowSpeedLimit: opts.default_network_low_speed_limit,
            lowSpeedTime: opts.default_network_low_speed_time,
            delay: opts.default_network_delay
        };
    }

    mono = nrdp.mono;
    assert = (cond: any, message: string) => { /* */ }; // nrdp.assert;
    btoa = nrdp.btoa;
    atob = nrdp.atob;
    atoutf8 = nrdp.atoutf8;
    utf8toa = nrdp.utf8toa;
    randomBytes = nrdp_platform.random;
    stacktrace = nrdp.stacktrace;

    utf8Length = nrdp_platform.utf8Length;

    writeFile(fileName: string, contents: Uint8Array | IDataBuffer | ArrayBuffer | string): boolean {
        const fd = N.open(fileName, N.O_CREAT | N.O_WRONLY, 0o0664);
        if (fd === -1) {
            this.error(`Failed to open ${fileName} for writing`, N.errno, N.strerror());
            return false;
        }
        const len = typeof contents === "string" ? this.utf8Length(contents) : contents.byteLength;
        const w = N.write(fd, contents);
        N.close(fd);
        if (w !== len) {
            this.error(`Failed to write to ${fileName} for writing ${w} vs ${len}`, N.errno, N.strerror());
            return false;
        }
        return true;
    }

    createSHA256Context(): ISHA256Context {
        return new nrdp_platform.Hasher("sha256");
    }

    createTCPNetworkPipe(options: ICreateTCPNetworkPipeOptions): Promise<IPipeResult> {
        return createNrdpTCPNetworkPipe(this, options);
    }
    createSSLNetworkPipe(options: ICreateSSLNetworkPipeOptions): Promise<IPipeResult> {
        return createNrdpSSLNetworkPipe(this, options);
    }

    lookupDnsHost = nrdp.dns.lookupHost.bind(nrdp.dns);

    get UILanguages(): string[] { return nrdp.device.UILanguages; }
    get location(): string { return nrdp.gibbon.location; }

    quit(exitCode: number = 0): void { nrdp.exit(exitCode); }

    parseXML(data: string | IDataBuffer): any { return nrdp_platform.parseXML(data); }
    parseJSONStream(data: string | IDataBuffer): any[] | undefined {
        return nrdp_platform.JSON.parse(data);
    }
    parseJSON(data: string | IDataBuffer): any | undefined {
        const ret = nrdp_platform.JSON.parse(data);
        if (ret)
            return ret[0];
        return undefined;
    }

    options(key: string): any {
        if (nrdp.js_options) {
            return nrdp.js_options[key];
        }
        return undefined;
    }

    polyfillGibbonLoad(mode: "all" | "optin", polyfill: NrdpGibbonLoadSignature): void {
        this.log("POLYFILLING", mode);
        if (mode === "optin") {
            this.miloLoad = polyfill;
            nrdp.gibbon.load = this.polyfilledGibbonLoad.bind(this);
        } else {
            nrdp.gibbon.load = polyfill;
        }
    }

    private polyfilledGibbonLoad(data: IRequestData | string,
                                 callback: NrdpGibbonLoadCallbackSignature): number {
        this.log("got load", data);
        if (typeof data === "string" || !data.milo || !this.miloLoad)
            return this.realLoad(data, callback);
        return this.miloLoad(data, callback);
    }

    private realLoad: NrdpGibbonLoadSignature;
    private miloLoad?: NrdpGibbonLoadSignature;
};

export default new NrdpPlatform();
