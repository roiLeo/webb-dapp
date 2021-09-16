export type ZKPTornPublicInputs = {
  nullifierHash: string;
  relayer: string;
  recipient: string;
  fee: number;
  refund: number;
};

export type ZKPTornInputsWithoutMerkle = {
  nullifierHash: string;
  relayer: string;
  recipient: string;
  fee: number;
  refund: number;
  nullifier: string;
  secret: string;
};

export type ZKPTornInputWithMerkle = {
  /// merkle proof
  root: string;
  pathElements: string[];
  pathIndices: number[];
} & ZKPTornInputsWithoutMerkle;

export type ZKPWebbPublicInputs = {
  nullifierHash: string;
  relayer: string;
  recipient: string;
  fee: number;
  refund: number;
  destinationChainId: number;
};

export type ZKPWebbInputWithoutMerkle = {
  nullifierHash: string;
  relayer: string;
  recipient: string;
  fee: number;
  refund: number;
  nullifier: string;
  secret: string;
  destinationChainId: number;
};

export type ZKPWebbInputWithMerkle = {
  /// merkle proof
  root: string;
  pathElements: string[];
  pathIndices: number[];
} & ZKPWebbInputWithoutMerkle;

export type BridgeWithesInput = {
  nullifierHash: string;
  recipient: string;
  relayer: string;
  fee: string;
  refund: string;
  chainID: string;
  roots: [any, 0];
  /// private
  nullifier: string;
  secret: string;
  pathElements: string[];

  pathIndices: number[];

  diffs: string;
};
