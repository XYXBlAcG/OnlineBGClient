import { useState } from "react";
import { Select, Switch } from "./ui/Controls";
import {
  aiProviderFormatInfo,
  aiProviderNeedsKey,
  aiProviderSettingsSchema,
  type AiProviderFormat,
  type AiProviderSettings,
  type CompanionConfig,
} from "../domain/companion";
import type { Snapshot } from "../domain/protocol";
import { loadAiConfig, type AiConfig } from "./ai-config";

export function AiSettings({
  config,
  status,
  onChange,
  onSaveProvider,
  onError,
}: {
  config: CompanionConfig;
  status: Snapshot["companion"];
  onChange: (config: CompanionConfig) => void;
  onSaveProvider: (config: AiConfig) => void;
  onError: (message: string) => void;
}) {
  const [stored] = useState(() => loadAiConfig());
  const [provider, setProvider] = useState<AiProviderSettings>(
    stored?.provider ?? config.provider,
  );
  const [apiKey, setApiKey] = useState(stored?.apiKey ?? "");
  const [persona, setPersona] = useState(config.profile.persona);
  const formatInfo = aiProviderFormatInfo[provider.format];
  const draftProfile = {
    ...config.profile,
    persona: persona.trim() || config.profile.persona,
  };

  const changeFormat = (format: AiProviderFormat): void => {
    setProvider((current) => {
      const previousDefault = aiProviderFormatInfo[current.format].baseUrl;
      return {
        ...current,
        format,
        baseUrl:
          !current.baseUrl.trim() || current.baseUrl === previousDefault
            ? aiProviderFormatInfo[format].baseUrl
            : current.baseUrl,
      };
    });
  };

  const saveProvider = (): void => {
    const model = provider.model.trim();
    if (!model) {
      onError("请填写模型名称");
      return;
    }
    if (aiProviderNeedsKey(provider.format) && !apiKey.trim()) {
      onError("请填写 API Key");
      return;
    }
    const next = aiProviderSettingsSchema.parse({
      ...provider,
      model,
      baseUrl: provider.baseUrl.trim(),
    });
    setProvider(next);
    onSaveProvider({ provider: next, apiKey: apiKey.trim() });
  };

  const commitPersona = (): void => {
    const value = persona.trim();
    if (!value || value === config.profile.persona) {
      setPersona(config.profile.persona);
      return;
    }
    onChange({ ...config, profile: { ...config.profile, persona: value } });
  };

  return (
    <>
      <label className="setting-row">
        接口格式
        <Select
          aria-label="AI 接口格式"
          value={provider.format}
          onValueChange={(format) =>
            changeFormat(format as AiProviderFormat)
          }
        >
          {Object.entries(aiProviderFormatInfo).map(([value, info]) => (
            <option key={value} value={value}>
              {info.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="setting-row">
        接口地址
        <input
          aria-label="AI 接口地址"
          value={provider.baseUrl}
          placeholder={formatInfo.baseUrl}
          onChange={(event) =>
            setProvider({ ...provider, baseUrl: event.target.value })
          }
        />
      </label>
      <label className="setting-row">
        模型
        <input
          aria-label="AI 模型"
          value={provider.model}
          placeholder="填写模型名称"
          onChange={(event) =>
            setProvider({ ...provider, model: event.target.value })
          }
        />
      </label>
      <label className="setting-row">
        API Key
        <input
          aria-label="AI API Key"
          type="password"
          autoComplete="off"
          value={apiKey}
          placeholder={
            formatInfo.needsKey
              ? status.configured
                ? "已保存，可重新填写"
                : "填写 API Key"
              : "本地模型可留空"
          }
          onChange={(event) => setApiKey(event.target.value)}
        />
      </label>
      <button type="button" onClick={saveProvider}>
        保存 AI 配置
      </button>
      <p className="muted" role="status">
        {status.configured
          ? `已接入 ${formatInfo.label} · ${provider.model || "未填写模型"}`
          : "保存后即可启用 AI 聊天。"}
      </p>
      <Switch
        label="启用 AI 聊天"
        checked={config.policy.enabled}
        disabled={
          !status.available || !status.configured
        }
        onCheckedChange={(enabled) =>
          onChange({
            ...config,
            profile: draftProfile,
            policy: { ...config.policy, enabled },
          })
        }
      />
      {!status.available && (
        <p className="muted">请先在准备页面添加 AI 席位。</p>
      )}
      <label className="setting-row">
        聊天 AI
        <strong>{status.name || "未添加"}</strong>
      </label>
      <p className="muted">名称在准备页面的 AI 席位中配置。</p>
      <label className="setting-row">
        人设
        <textarea
          aria-label="AI 人设"
          value={persona}
          rows={3}
          maxLength={1000}
          onChange={(event) => setPersona(event.target.value)}
          onBlur={commitPersona}
        />
      </label>
      <label className="setting-row">
        搭话模式
        <Select
          aria-label="AI 搭话模式"
          value={config.policy.mode}
          onValueChange={(mode) =>
            onChange({
              ...config,
              profile: draftProfile,
              policy: {
                ...config.policy,
                mode: mode as CompanionConfig["policy"]["mode"],
              },
            })
          }
        >
          <option value="mention-only">仅 @ 搭话</option>
          <option value="chatty">自由搭话</option>
        </Select>
      </label>
    </>
  );
}
