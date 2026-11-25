import { useEffect, useState } from "react";
import { capabilities } from "./platform";
import { Select, Switch } from "./ui/Controls";
import {
  aiProviderFormatInfo,
  aiProviderNeedsKey,
  aiProviderSettingsSchema,
  defaultAiProviderSettings,
  type AiProviderFormat,
  type AiProviderSettings,
  type CompanionConfig,
} from "../domain/companion";
import type { Snapshot } from "../domain/protocol";
import { hasAiApiKey, loadAiProvider, type AiConfig } from "./ai-config";

export function AiProviderSettings({
  fallbackProvider,
  status,
  onSaveProvider,
  onTestProvider,
  onClearProvider,
  onError,
}: {
  fallbackProvider?: AiProviderSettings;
  status?: Snapshot["companion"];
  onSaveProvider: (config: AiConfig) => Promise<string>;
  onClearProvider?: (provider: AiProviderSettings) => Promise<string>;
  onTestProvider?: (config: AiConfig) => Promise<string>;
  onError: (message: string) => void;
}) {
  const [provider, setProvider] = useState<AiProviderSettings>(
    () => loadAiProvider() ?? fallbackProvider ?? defaultAiProviderSettings,
  );
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [saved, setSaved] = useState(() => !!loadAiProvider()?.model);
  const [busy, setBusy] = useState<"save" | "test" | "clear" | null>(null);
  const [notice, setNotice] = useState("");
  const formatInfo = aiProviderFormatInfo[provider.format];
  const configured = status?.configured ?? false;

  useEffect(() => {
    let active = true;
    setHasKey(false);
    void hasAiApiKey(provider)
      .then((value) => {
        if (active) setHasKey(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [provider.format, provider.baseUrl]);

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

  const validatedProvider = (): AiProviderSettings | null => {
    const model = provider.model.trim();
    if (!model) {
      onError("请填写模型名称");
      return null;
    }
    if (aiProviderNeedsKey(provider.format) && !apiKey.trim() && !hasKey) {
      onError("请填写 API Key");
      return null;
    }
    const parsed = aiProviderSettingsSchema.safeParse({
      ...provider,
      model,
      baseUrl: provider.baseUrl.trim(),
    });
    if (!parsed.success) {
      onError(parsed.error.issues.map((issue) => issue.message).join("；"));
      return null;
    }
    return parsed.data;
  };

  const saveProvider = async (): Promise<void> => {
    const next = validatedProvider();
    if (!next) return;
    setBusy("save");
    setNotice("");
    try {
      const typedKey = apiKey.trim();
      const message = await onSaveProvider({
        provider: next,
        apiKey: typedKey,
      });
      setProvider(next);
      setApiKey("");
      setSaved(true);
      setNotice(message);
      setHasKey(typedKey ? true : await hasAiApiKey(next).catch(() => hasKey));
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const testProvider = async (): Promise<void> => {
    const next = validatedProvider();
    if (!next) return;
    if (!onTestProvider) {
      onError("进入房间后可以测试连接");
      return;
    }
    setBusy("test");
    setNotice("");
    try {
      setNotice(
        await onTestProvider({ provider: next, apiKey: apiKey.trim() }),
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const clearProvider = async (): Promise<void> => {
    if (!onClearProvider) return;
    setBusy("clear");
    try {
      setNotice(await onClearProvider(provider));
      setApiKey("");
      setHasKey(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "清除失败");
    } finally {
      setHasKey(await hasAiApiKey(provider).catch(() => hasKey));
      setBusy(null);
    }
  };

  return (
    <>
      <label className="setting-row ai-provider-row">
        接口格式
        <Select
          aria-label="AI 接口格式"
          value={provider.format}
          onValueChange={(format) => changeFormat(format as AiProviderFormat)}
        >
          {Object.entries(aiProviderFormatInfo).map(([value, info]) => (
            <option key={value} value={value}>
              {info.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="setting-row ai-provider-row">
        接口地址
        <input
          className="ai-provider-input"
          aria-label="AI 接口地址"
          maxLength={500}
          value={provider.baseUrl}
          placeholder={formatInfo.baseUrl}
          onChange={(event) =>
            setProvider({ ...provider, baseUrl: event.target.value })
          }
        />
      </label>
      <label className="setting-row ai-provider-row">
        模型
        <input
          className="ai-provider-input"
          aria-label="AI 模型"
          maxLength={120}
          value={provider.model}
          placeholder="填写模型名称"
          onChange={(event) =>
            setProvider({ ...provider, model: event.target.value })
          }
        />
      </label>
      <label className="setting-row ai-provider-row">
        API Key
        <input
          className="ai-provider-input"
          aria-label="AI API Key"
          type="password"
          maxLength={500}
          autoComplete="new-password"
          value={apiKey}
          placeholder={
            hasKey
              ? capabilities.secureAiKey
                ? "已保存到系统凭据；输入新 Key 可替换"
                : "已保存在当前会话；刷新后需重新填写"
              : formatInfo.needsKey
                ? "填写 API Key"
                : "本地模型可留空"
          }
          onChange={(event) => setApiKey(event.target.value)}
        />
      </label>
      <details>
        <summary>生成参数</summary>
        {(provider.format === "openai" || provider.format === "opencode") && (
          <label className="setting-row ai-provider-row">
            参数格式
            <Select
              aria-label="模型参数格式"
              value={provider.compatibility}
              onValueChange={(compatibility) =>
                setProvider({
                  ...provider,
                  compatibility: compatibility as "standard" | "reasoning",
                })
              }
            >
              <option value="standard">标准对话</option>
              <option value="reasoning">推理模型（不发送随机性）</option>
            </Select>
          </label>
        )}
        {(
          [
            ["temperature", "随机性", 0, 2, 0.1],
            ["contextWindow", "上下文窗口", 1024, 1000000, 1],
            ["maxOutputTokens", "输出上限", 16, 4096, 1],
            ["timeoutMs", "请求时限（毫秒）", 1000, 120000, 1000],
          ] as const
        ).map(([key, label, min, max, step]) => (
          <label className="setting-row ai-provider-row" key={key}>
            {label}
            <input
              className="ai-provider-input"
              type="number"
              aria-label={label}
              min={min}
              max={max}
              step={step}
              value={provider[key]}
              onChange={(event) =>
                setProvider({ ...provider, [key]: Number(event.target.value) })
              }
            />
          </label>
        ))}
      </details>
      {!onTestProvider && (
        <p className="muted">
          创建本机联机房间后可测试模型。本地对局使用搜索 AI。
        </p>
      )}
      <div className="ai-provider-actions">
        <button
          type="button"
          disabled={busy !== null || !onTestProvider}
          onClick={() => void testProvider()}
        >
          {busy === "test" ? "测试中…" : "测试连接"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void saveProvider()}
        >
          {busy === "save" ? "保存中…" : "保存 AI 配置"}
        </button>
        {onClearProvider && (
          <button
            type="button"
            disabled={busy !== null || (!hasKey && !configured)}
            onClick={() => void clearProvider()}
          >
            {busy === "clear" ? "清除中…" : "清除密钥并断开 AI"}
          </button>
        )}
      </div>
      <p className="muted" role="status">
        {notice ||
          (configured
            ? "当前房间已配置模型；修改后请重新保存并测试。"
            : status
              ? "保存后即可启用 AI 聊天。"
              : saved
                ? "已保存在本机；作为房主开房时生效。"
                : "保存后，在你作为房主开房时生效。")}
      </p>
    </>
  );
}

export function AiChatSettings({
  config,
  status,
  onChange,
}: {
  config: CompanionConfig;
  status: Snapshot["companion"];
  onChange: (config: CompanionConfig) => void;
}) {
  const [persona, setPersona] = useState(config.profile.persona);
  const draftProfile = {
    ...config.profile,
    persona: persona.trim() || config.profile.persona,
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
      <Switch
        label="启用 AI 聊天"
        checked={config.policy.enabled}
        disabled={
          !config.policy.enabled &&
          (!status.available || !status.server || !status.configured)
        }
        onCheckedChange={(enabled) =>
          onChange({
            ...config,
            profile: draftProfile,
            policy: { ...config.policy, enabled },
          })
        }
      />
      {!status.server ? (
        <p className="muted">
          本地对局使用搜索 AI；本机联机房间可启用 AI 聊天。
        </p>
      ) : !status.available ? (
        <p className="muted">请先在准备页面添加 AI 席位，并选择聊天 AI。</p>
      ) : (
        <p className="muted">
          保存 AI 配置后开启；聊天 AI 和 AI 驱动可在准备页面调整。
        </p>
      )}
      <label className="setting-row">
        聊天 AI
        <strong>{status.name || "未添加"}</strong>
      </label>
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
