import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, SRGBColorSpace, TextureLoader, type Texture } from 'three';

/*
 * A battle map of King's Raid's (KR-extracted/scripts/kr-map.py: a folder of its map.json and its pictures): each of
 * its meshes where the game puts it, drawn unlit in its picture as the game draws them. What has an alpha picture is
 * seen through where that says (its far hills, its haze), and drawn after what isn't.
 */

/** A map's file: each of its meshes, in the field's space (positions, picture places, and its triangles' corners). */
interface KrMapFile {
  name: string;
  pieces: { name: string; picture: string; alpha: boolean; tint?: [number, number, number, number]; position: number[]; uv: number[]; index: number[] }[];
}

/** Reads the map in `folder` (its pictures too), as one group. */
export async function loadKrMap(folder: string): Promise<Group> {
  const response = await fetch(`${folder}/map.json`);
  if (!response.ok) throw new Error(`The map in ${folder} isn't on this computer`);
  const file = (await response.json()) as KrMapFile;
  const loader = new TextureLoader();
  const pictures = new Map<string, Texture>(
    await Promise.all(
      [...new Set(file.pieces.map((piece) => piece.picture))].map(async (name) => {
        const picture = await loader.loadAsync(`${folder}/${name}.webp`);
        picture.colorSpace = SRGBColorSpace;
        return [name, picture] as const;
      }),
    ),
  );
  const map = new Group();
  map.name = file.name;
  for (const piece of file.pieces) {
    const shape = new BufferGeometry();
    shape.setAttribute('position', new Float32BufferAttribute(piece.position, 3));
    shape.setAttribute('uv', new Float32BufferAttribute(piece.uv, 2));
    shape.setIndex(piece.index);
    const look = new MeshBasicMaterial({ map: pictures.get(piece.picture) ?? null, side: DoubleSide, fog: false, transparent: piece.alpha, depthWrite: !piece.alpha });
    if (piece.tint) look.color.setRGB(piece.tint[0], piece.tint[1], piece.tint[2]);
    const mesh = new Mesh(shape, look);
    mesh.name = piece.name;
    // (Behind everything on the field: what is seen through, after the rest of the map.)
    mesh.renderOrder = piece.alpha ? -1 : -2;
    map.add(mesh);
  }
  return map;
}
