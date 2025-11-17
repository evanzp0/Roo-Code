import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI from "openai"

import { openAiModelInfoSaneDefaults } from "@roo-code/types"

import type { ApiHandlerOptions } from "../../shared/api"
import { getModelMaxOutputTokens } from "../../shared/api"
import { XmlMatcher } from "../../utils/xml-matcher"
import { ApiStream } from "../transform/stream"
import { convertToOpenAiMessages } from "../transform/openai-format"

import type { ApiHandlerCreateMessageMetadata } from "../index"
import { BaseProvider } from "./base-provider"
import { handleOpenAIError } from "./utils/openai-error-handler"

export class CTyunHandler extends BaseProvider {
	protected readonly options: ApiHandlerOptions
	protected client: OpenAI
	private readonly providerName = "CTyun"
	private readonly log: (...args: unknown[]) => void

	constructor(options: ApiHandlerOptions) {
		super()
		this.options = options

		// Create a simple logger that outputs to console
		this.log = (...args: unknown[]) => {
			console.log(`[${this.providerName}]`, ...args)
		}

		if (!this.options.ctyunApiKey) {
			throw new Error("CTyun API key is required")
		}

		const baseURL = this.options.ctyunBaseUrl ?? "https://wishub-x6.ctyun.cn/v1"

		// CTyun requires specific headers:
		// - Content-Type: application/json; charset=utf-8
		// - Authorization: Bearer {apiKey}
		// We don't use DEFAULT_HEADERS to avoid triggering security filters
		this.client = new OpenAI({
			baseURL,
			apiKey: this.options.ctyunApiKey,
			defaultHeaders: {
				"Content-Type": "application/json; charset=utf-8",
			},
		})
	}

	override async *createMessage(
		systemPrompt: string,
		messages: Anthropic.Messages.MessageParam[],
		metadata?: ApiHandlerCreateMessageMetadata,
	): ApiStream {
		const { id: model, info } = this.getModel()

		const max_tokens =
			getModelMaxOutputTokens({
				modelId: model,
				model: info,
				settings: this.options,
				format: "openai",
			}) ?? undefined

		const temperature = this.options.modelTemperature ?? 0.7

		const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
			model,
			max_tokens,
			temperature,
			messages: [{ role: "system", content: systemPrompt }, ...convertToOpenAiMessages(messages)],
			stream: true,
			stream_options: { include_usage: true },
		}

		// Log the request details
		this.log(`=== CTyun API Request ===`)
		this.log(`Model: ${model}`)
		this.log(`Max Tokens: ${max_tokens}`)
		this.log(`Temperature: ${temperature}`)
		this.log(`System Prompt: ${systemPrompt}`)
		this.log(`Messages:`, JSON.stringify(messages, null, 2))
		this.log(`Full Request:`, JSON.stringify(params, null, 2))
		this.log(`=======================`)

		try {
			// Use custom request options to ensure proper headers
			const stream = await this.client.chat.completions.create(params, {
				headers: {
					"Content-Type": "application/json; charset=utf-8",
					Authorization: `Bearer ${this.options.ctyunApiKey}`,
				},
			})

			const matcher = new XmlMatcher(
				"think",
				(chunk) =>
					({
						type: chunk.matched ? "reasoning" : "text",
						text: chunk.data,
					}) as const,
			)

			let responseContent = ""
			let reasoningContent = ""
			let usageData: any = null

			for await (const chunk of stream) {
				const delta = chunk.choices?.[0]?.delta

				if (delta?.content) {
					responseContent += delta.content
					for (const processedChunk of matcher.update(delta.content)) {
						yield processedChunk
					}
				}

				if (delta && "reasoning_content" in delta) {
					const reasoning_content = (delta.reasoning_content as string | undefined) || ""
					if (reasoning_content?.trim()) {
						reasoningContent += reasoning_content
						yield { type: "reasoning", text: reasoning_content }
					}
				}

				if (chunk.usage) {
					usageData = chunk.usage
					yield {
						type: "usage",
						inputTokens: chunk.usage.prompt_tokens || 0,
						outputTokens: chunk.usage.completion_tokens || 0,
					}
				}
			}

			// Process any remaining content
			for (const processedChunk of matcher.final()) {
				yield processedChunk
			}

			// Log the response details
			this.log(`=== CTyun API Response ===`)
			this.log(`Response Content: ${responseContent}`)
			if (reasoningContent) {
				this.log(`Reasoning Content: ${reasoningContent}`)
			}
			if (usageData) {
				this.log(`Usage:`, JSON.stringify(usageData, null, 2))
			}
			this.log(`=======================`)
		} catch (error) {
			this.log(`=== CTyun API Error ===`)
			this.log(`Error:`, error)
			this.log(`=======================`)
			throw handleOpenAIError(error, this.providerName)
		}
	}

	override getModel() {
		// Use apiModelId directly as the model ID (user must provide it)
		const id = this.options.apiModelId ?? ""
		// Use sane defaults for model info since we don't have predefined models
		const info = openAiModelInfoSaneDefaults
		return { id, info }
	}

	async completePrompt(prompt: string): Promise<string> {
		const { id: modelId } = this.getModel()

		// Log the completePrompt request
		this.log(`=== CTyun CompletePrompt Request ===`)
		this.log(`Model: ${modelId}`)
		this.log(`Prompt: ${prompt}`)
		this.log(`===============================`)

		try {
			const response = await this.client.chat.completions.create(
				{
					model: modelId,
					messages: [{ role: "user", content: prompt }],
				},
				{
					headers: {
						"Content-Type": "application/json; charset=utf-8",
						Authorization: `Bearer ${this.options.ctyunApiKey}`,
					},
				},
			)

			const responseContent = response.choices?.[0]?.message.content || ""

			// Log the completePrompt response
			this.log(`=== CTyun CompletePrompt Response ===`)
			this.log(`Response: ${responseContent}`)
			if (response.usage) {
				this.log(`Usage:`, JSON.stringify(response.usage, null, 2))
			}
			this.log(`================================`)

			return responseContent
		} catch (error) {
			this.log(`=== CTyun CompletePrompt Error ===`)
			this.log(`Error:`, error)
			this.log(`===============================`)
			throw handleOpenAIError(error, this.providerName)
		}
	}

	override async countTokens(content: Array<Anthropic.Messages.ContentBlockParam>): Promise<number> {
		// Use default tiktoken implementation
		return super.countTokens(content)
	}
}
