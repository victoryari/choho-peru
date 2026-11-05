import { Categoria } from "../types";

export interface NodoCategoria extends Categoria {
  hijos: NodoCategoria[];
}

/** Construye el arbol de categorias a partir de la lista plana. */
export function construirArbol(categorias: Categoria[]): NodoCategoria[] {
  const lista = (Array.isArray(categorias) ? categorias : []).filter(c => c && c.activo !== false);
  const porId = new Map<string, NodoCategoria>();
  for (const c of lista) porId.set(c.id, { ...c, hijos: [] });

  const raices: NodoCategoria[] = [];
  for (const nodo of porId.values()) {
    const padre = nodo.parentId ? porId.get(nodo.parentId) : undefined;
    if (padre) {
      padre.hijos.push(nodo);
    } else {
      raices.push(nodo);
    }
  }

  const ordenar = (nodos: NodoCategoria[]) => {
    nodos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    nodos.forEach(n => ordenar(n.hijos));
  };
  ordenar(raices);
  return raices;
}

/** Devuelve los hijos directos de un nodo, en orden alfabetico. */
export function hijosDe(categorias: Categoria[], parentId: string | null): Categoria[] {
  return (Array.isArray(categorias) ? categorias : [])
    .filter(c => c && c.activo !== false && (c.parentId || null) === (parentId || null))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Ruta desde la familia hasta el nodo indicado, para mostrar breadcrumbs. */
export function rutaDe(categorias: Categoria[], id: string | null | undefined): Categoria[] {
  if (!id) return [];
  const porId = new Map((categorias || []).map(c => [c.id, c]));
  const ruta: Categoria[] = [];
  let actual = porId.get(id);
  let guardia = 0;
  while (actual && guardia < 10) {
    ruta.unshift(actual);
    actual = actual.parentId ? porId.get(actual.parentId) : undefined;
    guardia++;
  }
  return ruta;
}

/** Nombre legible de la clasificacion de un producto: "Familia / Sub-familia Linea". */
export function etiquetaClasificacion(
  producto: { familia?: { nombre?: string } | null; subFamilia?: { nombre?: string } | null; linea?: { nombre?: string } | null }
): string {
  return [producto?.familia?.nombre, producto?.subFamilia?.nombre, producto?.linea?.nombre]
    .filter(Boolean)
    .join("/");
}
