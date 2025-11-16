import { useCallback } from "react"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"

import type { ProviderSettings } from "@roo-code/types"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { VSCodeButtonLink } from "@src/components/common/VSCodeButtonLink"

import { inputEventTransform } from "../transforms"

type CTyunProps = {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: <K extends keyof ProviderSettings>(field: K, value: ProviderSettings[K]) => void
}

export const CTyun = ({ apiConfiguration, setApiConfigurationField }: CTyunProps) => {
	const { t } = useAppTranslation()

	const handleInputChange = useCallback(
		<K extends keyof ProviderSettings, E>(
			field: K,
			transform: (event: E) => ProviderSettings[K] = inputEventTransform,
		) =>
			(event: E | Event) => {
				setApiConfigurationField(field, transform(event as E))
			},
		[setApiConfigurationField],
	)

	return (
		<>
			<VSCodeTextField
				value={apiConfiguration?.ctyunBaseUrl || ""}
				type="url"
				onInput={handleInputChange("ctyunBaseUrl")}
				placeholder="https://wishub-x6.ctyun.cn/v1"
				className="w-full">
				<label className="block font-medium mb-1">{t("settings:providers.ctyunBaseUrl")}</label>
			</VSCodeTextField>
			<div className="text-sm text-vscode-descriptionForeground -mt-2 mb-2">
				{t("settings:providers.ctyunBaseUrlDescription")}
			</div>
			<VSCodeTextField
				value={apiConfiguration?.ctyunApiKey || ""}
				type="password"
				onInput={handleInputChange("ctyunApiKey")}
				placeholder={t("settings:placeholders.apiKey")}
				className="w-full">
				<label className="block font-medium mb-1">{t("settings:providers.ctyunApiKey")}</label>
			</VSCodeTextField>
			<div className="text-sm text-vscode-descriptionForeground -mt-2 mb-2">
				{t("settings:providers.apiKeyStorageNotice")}
			</div>
			<VSCodeTextField
				value={apiConfiguration?.apiModelId || ""}
				type="text"
				onInput={handleInputChange("apiModelId")}
				placeholder="11bd888a35434486bf209066c7dad0ee"
				className="w-full">
				<label className="block font-medium mb-1">{t("settings:providers.ctyunModelId")}</label>
			</VSCodeTextField>
			<div className="text-sm text-vscode-descriptionForeground -mt-2 mb-2">
				{t("settings:providers.ctyunModelIdDescription")}
			</div>
			{!apiConfiguration?.ctyunApiKey && (
				<VSCodeButtonLink href="https://www.ctyun.cn/" appearance="secondary">
					{t("settings:providers.getCTyunApiKey")}
				</VSCodeButtonLink>
			)}
		</>
	)
}
