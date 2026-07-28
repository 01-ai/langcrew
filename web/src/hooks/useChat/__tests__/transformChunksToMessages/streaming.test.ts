import { describe, it, expect } from 'vitest';
import { streamingChunks } from '../mock';
import { MessageChunk } from '@/types';
import { transformChunksToMessages } from '../../transformChunksToMessages';

describe('transformChunksToMessages', () => {
  it('1', () => {
    const stepByStepMessages = transformChunksToMessages(streamingChunks.slice(0, 1) as MessageChunk[], []);
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 1) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('2', () => {
    const stepByStepMessages = transformChunksToMessages(
      streamingChunks.slice(1, 2) as MessageChunk[],
      transformChunksToMessages(streamingChunks.slice(0, 1) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 2) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('3', () => {
    const stepByStepMessages = transformChunksToMessages(
      streamingChunks.slice(2, 3) as MessageChunk[],
      transformChunksToMessages(streamingChunks.slice(0, 2) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 3) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('4', () => {
    const stepByStepMessages = transformChunksToMessages(
      streamingChunks.slice(3, 4) as MessageChunk[],
      transformChunksToMessages(streamingChunks.slice(0, 3) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 4) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('5', () => {
    const stepByStepMessages = transformChunksToMessages(
      streamingChunks.slice(4, 5) as MessageChunk[],
      transformChunksToMessages(streamingChunks.slice(0, 4) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 5) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('6', () => {
    const stepByStepMessages = transformChunksToMessages(
      streamingChunks.slice(5, 6) as MessageChunk[],
      transformChunksToMessages(streamingChunks.slice(0, 5) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 6) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('7', () => {
    const stepByStepMessages = transformChunksToMessages(
      streamingChunks.slice(6, 7) as MessageChunk[],
      transformChunksToMessages(streamingChunks.slice(0, 6) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 7) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('8', () => {
    const stepByStepMessages = transformChunksToMessages(
      streamingChunks.slice(7, 8) as MessageChunk[],
      transformChunksToMessages(streamingChunks.slice(0, 7) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 8) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('9', () => {
    const stepByStepMessages = transformChunksToMessages(
      streamingChunks.slice(8, 9) as MessageChunk[],
      transformChunksToMessages(streamingChunks.slice(0, 8) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 9) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('10', () => {
    const stepByStepMessages = transformChunksToMessages(
      streamingChunks.slice(9, 10) as MessageChunk[],
      transformChunksToMessages(streamingChunks.slice(0, 9) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 10) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('21', () => {
    const stepByStepMessages = transformChunksToMessages(
      streamingChunks.slice(20, 21) as MessageChunk[],
      transformChunksToMessages(streamingChunks.slice(0, 20) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 21) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('22', () => {
    const stepByStepMessages = transformChunksToMessages(
      streamingChunks.slice(21, 22) as MessageChunk[],
      transformChunksToMessages(streamingChunks.slice(0, 21) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 22) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('23', () => {
    const stepByStepMessages = transformChunksToMessages(
      streamingChunks.slice(22, 23) as MessageChunk[],
      transformChunksToMessages(streamingChunks.slice(0, 22) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 23) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('24', () => {
    const stepByStepMessages = transformChunksToMessages(
      streamingChunks.slice(23, 24) as MessageChunk[],
      transformChunksToMessages(streamingChunks.slice(0, 23) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 24) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
  it('25', () => {
    const stepByStepMessages = transformChunksToMessages(
      streamingChunks.slice(24, 25) as MessageChunk[],
      transformChunksToMessages(streamingChunks.slice(0, 24) as MessageChunk[]),
    );
    const onceMessages = transformChunksToMessages(streamingChunks.slice(0, 25) as MessageChunk[]);

    expect(stepByStepMessages).toEqual(onceMessages);
  });
});
