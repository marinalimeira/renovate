import { logger } from '../../logger';
import { ensureTrailingSlash } from '../../util/url';
import type { FetchPresetConfig, Preset } from './types';

export const PRESET_DEP_NOT_FOUND = 'dep not found';
export const PRESET_INVALID = 'invalid preset';
export const PRESET_INVALID_JSON = 'invalid preset JSON';
export const PRESET_NOT_FOUND = 'preset not found';
export const PRESET_PROHIBITED_SUBPRESET = 'prohibited sub-preset';
export const PRESET_RENOVATE_CONFIG_NOT_FOUND =
  'preset renovate-config not found';

export async function fetchPreset({
  pkgName,
  filePreset,
  presetPath,
  endpoint: _endpoint,
  packageTag = null,
  fetch,
}: FetchPresetConfig): Promise<Preset | undefined> {
  const endpoint = ensureTrailingSlash(_endpoint);
  const [fileName, presetName, subPresetName] = filePreset.split('/');
  const pathPrefix = presetPath ? `${presetPath}/` : '';
  const buildFilePath = (name: string): string => `${pathPrefix}${name}`;
  let jsonContent: any | undefined;
  if (fileName === 'default') {
    try {
      jsonContent = await fetch(
        pkgName,
        buildFilePath('default.json'),
        endpoint,
        packageTag
      );
    } catch (err) {
      if (err.message !== PRESET_DEP_NOT_FOUND) {
        throw err;
      }
      logger.info(
        'Fallback to renovate.json file as a preset is deprecated, please use a default.json file instead.'
      );
      jsonContent = await fetch(
        pkgName,
        buildFilePath('renovate.json'),
        endpoint,
        packageTag
      );
    }
  } else {
    jsonContent = await fetch(
      pkgName,
      buildFilePath(`${fileName}.json`),
      endpoint,
      packageTag
    );
  }

  if (!jsonContent) {
    throw new Error(PRESET_DEP_NOT_FOUND);
  }
  if (presetName) {
    const preset = jsonContent[presetName];
    if (!preset) {
      throw new Error(PRESET_NOT_FOUND);
    }
    if (subPresetName) {
      const subPreset = preset[subPresetName];
      if (!subPreset) {
        throw new Error(PRESET_NOT_FOUND);
      }
      return subPreset;
    }
    return preset;
  }
  return jsonContent;
}
