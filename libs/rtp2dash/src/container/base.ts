export interface ContainerTranscoder {}

export interface ContainerOutput {
  operation: "write" | "append";
  init?: Buffer;
  chunk?: Buffer;
  previousDuration?: number;
}
