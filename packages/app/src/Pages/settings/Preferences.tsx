import "./Preferences.css";

import { FormattedMessage, useIntl } from "react-intl";

import { AllLanguageCodes } from "@/Components/IntlProvider/IntlProviderUtils";
import { useLocale } from "@/Components/IntlProvider/useLocale";
import useLogin from "@/Hooks/useLogin";
import { unwrap } from "@/Utils";
import { DefaultImgProxy } from "@/Utils/Const";
import { updatePreferences, UserPreferences } from "@/Utils/Login";

import messages from "./messages";

const PreferencesPage = () => {
  const { formatMessage } = useIntl();
  const { id, pref } = useLogin(s => ({ id: s.id, pref: s.appData.item.preferences }));
  const { lang } = useLocale();

  return (
    <div className="preferences flex flex-col g24">
      <h3>
        <FormattedMessage {...messages.Preferences} />
      </h3>

      <div className="flex justify-between w-max">
        <h4>
          <FormattedMessage defaultMessage="Language" id="y1Z3or" />
        </h4>
        <div>
          <select
            value={lang}
            onChange={e =>
              updatePreferences(id, {
                ...pref,
                language: e.target.value,
              })
            }
            style={{ textTransform: "capitalize" }}>
            {AllLanguageCodes.sort().map(a => (
              <option key={a} value={a}>
                {new Intl.DisplayNames([a], {
                  type: "language",
                }).of(a)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-between w-max">
        <h4>
          <FormattedMessage {...messages.Theme} />
        </h4>
        <div>
          <select
            value={pref.theme}
            onChange={e =>
              updatePreferences(id, {
                ...pref,
                theme: e.target.value,
              } as UserPreferences)
            }>
            <option value="system">
              <FormattedMessage {...messages.System} />
            </option>
            <option value="light">
              <FormattedMessage {...messages.Light} />
            </option>
            <option value="dark">
              <FormattedMessage {...messages.Dark} />
            </option>
          </select>
        </div>
      </div>
      <div className="flex justify-between w-max">
        <h4>
          <FormattedMessage {...messages.DefaultRootTab} />
        </h4>
        <div>
          <select
            value={pref.defaultRootTab}
            onChange={e =>
              updatePreferences(id, {
                ...pref,
                defaultRootTab: e.target.value,
              } as UserPreferences)
            }>
            <option value="notes">
              <FormattedMessage defaultMessage="Notes" id="7+Domh" />
            </option>
            <option value="conversations">
              <FormattedMessage {...messages.Conversations} />
            </option>
            <option value="global">
              <FormattedMessage {...messages.Global} />
            </option>
          </select>
        </div>
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Send usage metrics" id="XECMfW" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Send anonymous usage metrics" id="/Xf4UW" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.telemetry ?? true}
            onChange={e => updatePreferences(id, { ...pref, telemetry: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage {...messages.AutoloadMedia} />
          </h4>
          <small>
            <FormattedMessage {...messages.AutoloadMediaHelp} />
          </small>
          <div className="w-max">
            <select
              className="w-max"
              value={pref.autoLoadMedia}
              onChange={e =>
                updatePreferences(id, {
                  ...pref,
                  autoLoadMedia: e.target.value,
                } as UserPreferences)
              }>
              <option value="none">
                <FormattedMessage {...messages.None} />
              </option>
              <option value="follows-only">
                <FormattedMessage {...messages.FollowsOnly} />
              </option>
              <option value="all">
                <FormattedMessage {...messages.All} />
              </option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Check Signatures" id="1o2BgB" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Check all event signatures received from relays" id="UNjfWJ" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.checkSigs}
            onChange={e => updatePreferences(id, { ...pref, checkSigs: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Auto Translate" id="IWz1ta" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Automatically translate notes to your local language" id="WmZhfL" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.autoTranslate}
            onChange={e => updatePreferences(id, { ...pref, autoTranslate: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Proof of Work" id="grQ+mI" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Amount of work to apply to all published events" id="vxwnbh" />
          </small>
        </div>
        <div>
          <input
            type="number"
            defaultValue={pref.pow}
            min={0}
            onChange={e => updatePreferences(id, { ...pref, pow: parseInt(e.target.value || "0") })}
          />
        </div>
      </div>
      <div className="flex justify-between w-max">
        <h4>
          <FormattedMessage defaultMessage="Default Zap amount" id="qMx1sA" />
        </h4>
        <div>
          <input
            type="number"
            defaultValue={pref.defaultZapAmount}
            min={1}
            onChange={e => updatePreferences(id, { ...pref, defaultZapAmount: parseInt(e.target.value || "0") })}
          />
        </div>
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Show Badges" id="sKDn4e" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Show badges on profile pages" id="EQKRE4" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.showBadges ?? false}
            onChange={e => updatePreferences(id, { ...pref, showBadges: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Show Status" id="0uoY11" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Show status messages on profile pages" id="FMfjrl" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.showStatus ?? true}
            onChange={e => updatePreferences(id, { ...pref, showStatus: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Auto Zap" id="Dh3hbq" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Automatically zap every note when loaded" id="D+KzKd" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.autoZap}
            onChange={e => updatePreferences(id, { ...pref, autoZap: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex justify-between">
          <div className="flex flex-col g8">
            <h4>
              <FormattedMessage {...messages.ImgProxy} />
            </h4>
            <small>
              <FormattedMessage {...messages.ImgProxyHelp} />
            </small>
          </div>
          <div>
            <input
              type="checkbox"
              checked={pref.imgProxyConfig !== null}
              onChange={e =>
                updatePreferences(id, {
                  ...pref,
                  imgProxyConfig: e.target.checked ? DefaultImgProxy : undefined,
                })
              }
            />
          </div>
        </div>
        {pref.imgProxyConfig && (
          <div className="w-max form">
            <div className="form-group">
              <div>
                <FormattedMessage {...messages.ServiceUrl} />
              </div>
              <div className="w-max">
                <input
                  type="text"
                  value={pref.imgProxyConfig?.url}
                  placeholder={formatMessage({
                    defaultMessage: "URL..",
                    id: "cQfLWb",
                    description: "Placeholder text for imgproxy url textbox",
                  })}
                  onChange={e =>
                    updatePreferences(id, {
                      ...pref,
                      imgProxyConfig: {
                        ...unwrap(pref.imgProxyConfig),
                        url: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <div>
                <FormattedMessage {...messages.ServiceKey} />
              </div>
              <div className="w-max">
                <input
                  type="password"
                  value={pref.imgProxyConfig?.key}
                  placeholder={formatMessage({
                    defaultMessage: "Hex Key..",
                    id: "H+vHiz",
                    description: "Hexidecimal 'key' input for improxy",
                  })}
                  onChange={e =>
                    updatePreferences(id, {
                      ...pref,
                      imgProxyConfig: {
                        ...unwrap(pref.imgProxyConfig),
                        key: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <div>
                <FormattedMessage {...messages.ServiceSalt} />
              </div>
              <div className="w-max">
                <input
                  type="password"
                  value={pref.imgProxyConfig?.salt}
                  placeholder={formatMessage({
                    defaultMessage: "Hex Salt..",
                    id: "TpgeGw",
                    description: "Hexidecimal 'salt' input for imgproxy",
                  })}
                  onChange={e =>
                    updatePreferences(id, {
                      ...pref,
                      imgProxyConfig: {
                        ...unwrap(pref.imgProxyConfig),
                        salt: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between w-max">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage {...messages.EnableReactions} />
          </h4>
          <small>
            <FormattedMessage {...messages.EnableReactionsHelp} />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.enableReactions}
            onChange={e => updatePreferences(id, { ...pref, enableReactions: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex flex-col g8">
        <h4>
          <FormattedMessage {...messages.ReactionEmoji} />
        </h4>
        <small>
          <FormattedMessage {...messages.ReactionEmojiHelp} />
        </small>
        <input
          type="text"
          value={pref.reactionEmoji}
          onChange={e => {
            const split = e.target.value.match(/[\p{L}\S]{1}/u);
            updatePreferences(id, {
              ...pref,
              reactionEmoji: split?.[0] ?? "",
            });
          }}
        />
      </div>
      <div className="flex justify-between">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage {...messages.ConfirmReposts} />
          </h4>
          <small>
            <FormattedMessage {...messages.ConfirmRepostsHelp} />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.confirmReposts}
            onChange={e => updatePreferences(id, { ...pref, confirmReposts: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex justify-between">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage {...messages.ShowLatest} />
          </h4>
          <small>
            <FormattedMessage {...messages.ShowLatestHelp} />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.autoShowLatest}
            onChange={e => updatePreferences(id, { ...pref, autoShowLatest: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex flex-col g8">
        <h4>
          <FormattedMessage {...messages.FileUpload} />
        </h4>
        <small>
          <FormattedMessage {...messages.FileUploadHelp} />
        </small>
        <select
          value={pref.fileUploader}
          onChange={e =>
            updatePreferences(id, {
              ...pref,
              fileUploader: e.target.value,
            } as UserPreferences)
          }>
          <option value="void.cat">
            void.cat <FormattedMessage {...messages.Default} />
          </option>
          <option value="void.cat-NIP96">void.cat (NIP-96)</option>
          <option value="nostr.build">nostr.build</option>
          <option value="nostrimg.com">nostrimg.com</option>
          <option value="nostrcheck.me">nostrcheck.me (NIP-96)</option>
        </select>
      </div>
      <div className="flex justify-between">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage {...messages.DebugMenus} />
          </h4>
          <small>
            <FormattedMessage {...messages.DebugMenusHelp} />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.showDebugMenus}
            onChange={e => updatePreferences(id, { ...pref, showDebugMenus: e.target.checked })}
          />
        </div>
      </div>
      <div className="flex justify-between">
        <div className="flex flex-col g8">
          <h4>
            <FormattedMessage defaultMessage="Hide muted notes" id="9kO0VQ" />
          </h4>
          <small>
            <FormattedMessage defaultMessage="Muted notes will not be shown" id="sfL/O+" />
          </small>
        </div>
        <div>
          <input
            type="checkbox"
            checked={pref.hideMutedNotes}
            onChange={e => updatePreferences(id, { ...pref, hideMutedNotes: e.target.checked })}
          />
        </div>
      </div>
    </div>
  );
};
export default PreferencesPage;
