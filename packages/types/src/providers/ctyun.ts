import type { ModelInfo } from "../model.js"

// CTyun (天翼云)
// https://www.ctyun.cn/
export type CTyunModelId = keyof typeof ctyunModels
export const ctyunDefaultModelId: CTyunModelId = "DeepSeek-V3.1"

export const ctyunModels = {
	"DeepSeek-V3.1": {
		maxTokens: 65536, // 64K max output for reasoning mode
		contextWindow: 128_000,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0.56, // $0.56 per million tokens (cache miss) - Updated Sept 5, 2025
		outputPrice: 1.68, // $1.68 per million tokens - Updated Sept 5, 2025
		cacheWritesPrice: 0.56, // $0.56 per million tokens (cache miss) - Updated Sept 5, 2025
		cacheReadsPrice: 0.07, // $0.07 per million tokens (cache hit) - Updated Sept 5, 2025
		description: `DeepSeek-R1 achieves performance comparable to OpenAI-o1 across math, code, and reasoning tasks. Supports Chain of Thought reasoning with up to 64K output tokens.`,
	},
} as const satisfies Record<string, ModelInfo>
