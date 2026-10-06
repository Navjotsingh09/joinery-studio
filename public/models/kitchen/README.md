# Kitchen models

Six optimised GLB components derived from three CC0 BlendSwap sources:

| Source | Author | Components |
| --- | --- | --- |
| [Modern Faucet](https://blendswap.com/blend/5176) | MattMump | cross-handle-mixer |
| [Kitchen Worktop](https://blendswap.com/blend/17672) | MZiemys | inset-sink, square-mixer, gas-hob |
| [Kitchen Asset Library-Pack photoreal Vol.1](https://blendswap.com/blend/25903) | Davilion | ceramic-mug, cooking-pot |

All three sources were labelled CC0 at download on 6 October 2026. No account key is needed by the deployed application. The source files were downloaded through the owner-authorised BlendSwap account using free allowance.

Source Blender procedural shaders are replaced with explicit glTF PBR materials; the editor can set metal finishes. Mesh modifiers are baked, irrelevant room objects removed, and each component is centred and normalised to unit bounds for parametric dimensions. These are generic visual components, not certified manufacturer products.

Reproduction: download the original source blend files, then use Blender 4.2 in background mode with auto-execution disabled. The conversion scripts are in `scripts/assets/`. For example:

```sh
blender --background --disable-autoexec Worktop.blend --python scripts/assets/convert_worktop.py
```

Use Faucet.blend with convert_faucet.py and the library-pack blend with convert_props.py. The scripts never access the network or require credentials.
