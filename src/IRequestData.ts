import { DnsType, HTTPMethod, IpConnectivityMode } from "./types";
import IOnHeadersData from "./IOnHeadersData";
import IRequestTimeouts from "./IRequestTimeouts";

export default interface IRequestData {
    async?: boolean;
    baseUrl?: string;
    body?: string | ArrayBuffer | Uint8Array;
    cache?: string;
    debugThroughput?: boolean;
    dependsOn?: string | ArrayBuffer | Uint8Array | number;
    dnsChannel?: string;
    dnsTime?: number;
    dnsType?: DnsType;
    exclusiveDepends?: boolean;
    forbidReuse?: boolean;
    format?: "xml" | "json" | "jsonstream" | "arraybuffer" | "uint8array" | "databuffer" | "none";
    freshConnect?: boolean;
    headers?: { [key: string]: string };
    http2?: boolean;
    ipAddresses?: string[];
    ipConnectivityMode?: IpConnectivityMode;
    maxRecvSpeed?: number;
    maxSendSpeed?: number;
    method?: HTTPMethod;
    milo?: boolean;
    networkMetricsPrecision?: "us" | "ms" | "none";
    noProxy?: boolean;
    onChunk?: (chunk: ArrayBuffer) => void;
    onData?: (data: ArrayBuffer) => void;
    onHeaders?: (data: IOnHeadersData) => void;
    pipeWait?: boolean;
    receiveBufferSize?: number;
    secure?: boolean;
    tcpNoDelay?: boolean;
    timeouts?: IRequestTimeouts;
    tlsv13?: boolean;
    url: string;
    weight?: number;
};
