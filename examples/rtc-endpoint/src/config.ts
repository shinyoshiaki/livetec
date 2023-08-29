export interface Config {
  port: number;
  staticPort: number;
  endpoint: string;
}

export const config: Config = {
  port: 8801,
  staticPort: 8802,
  endpoint: "http://localhost:8801",
};
