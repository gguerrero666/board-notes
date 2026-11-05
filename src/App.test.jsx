import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App.jsx'

const asaDe = (nota) => within(nota).getByLabelText('Mover nota')

afterEach(() => {
  vi.restoreAllMocks()
})

test('al abrir el board se muestran las notas existentes con título y texto', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [
      { id: 1, title: 'Comprar leche', text: 'Entera, 2 litros' },
      { id: 2, title: 'Llamar al dentista', text: 'Martes por la tarde' },
    ],
  })

  render(<App />)

  expect(await screen.findByText('Comprar leche')).toBeInTheDocument()
  expect(screen.getByText('Entera, 2 litros')).toBeInTheDocument()
  expect(screen.getByText('Llamar al dentista')).toBeInTheDocument()
  expect(screen.getByText('Martes por la tarde')).toBeInTheDocument()
  expect(fetch).toHaveBeenCalledWith('/api/notes')
})

test('si la petición de carga falla por red, se muestra el mensaje y el botón + sigue visible', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

  render(<App />)

  expect(await screen.findByText('No se pudieron cargar las notas.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Agregar nota' })).toBeEnabled()
})

test('si el servidor responde con error al cargar, se muestra el mensaje y el botón + sigue visible', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({ status: 500, error: 'Internal Server Error' }),
  })

  render(<App />)

  expect(await screen.findByText('No se pudieron cargar las notas.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Agregar nota' })).toBeEnabled()
  // El objeto de error no se pinta como si fuera una nota
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
})

test('si la carga falló, un guardado exitoso posterior no borra el mensaje de carga', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'POST') {
      return { ok: true, json: async () => ({ id: 12, title: 'Nueva', text: '' }) }
    }
    throw new TypeError('Failed to fetch')
  })
  const user = userEvent.setup()

  render(<App />)
  expect(await screen.findByText('No se pudieron cargar las notas.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
  const nueva = screen.getByRole('article')
  await user.type(within(nueva).getByLabelText('Título de la nota'), 'Nueva')
  await user.click(within(nueva).getByRole('button', { name: 'Guardar' }))

  expect(await screen.findByText('Nueva')).toBeInTheDocument()
  expect(within(screen.getByRole('article')).getByRole('button', { name: 'Editar nota' })).toBeInTheDocument()
  expect(screen.getByText('No se pudieron cargar las notas.')).toBeInTheDocument()
})

test('las notas con posición guardada aparecen en esa posición', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [
      { id: 1, title: 'Arriba a la izquierda', text: 'a', x: 0, y: 0 },
      { id: 2, title: 'Movida', text: 'b', x: 120, y: 80 },
    ],
  })

  render(<App />)

  const movida = (await screen.findByText('Movida')).closest('article')
  expect(movida).toHaveStyle({ left: '120px', top: '80px' })
  const origen = screen.getByText('Arriba a la izquierda').closest('article')
  expect(origen).toHaveStyle({ left: '0px', top: '0px' })
})

test('las notas sin posición aparecen en posiciones iniciales distintas entre sí', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [
      { id: 1, title: 'Sin mover 1', text: 'a', x: null, y: null },
      { id: 2, title: 'Sin mover 2', text: 'b', x: null, y: null },
      { id: 3, title: 'Sin mover 3', text: 'c', x: null, y: null },
    ],
  })

  render(<App />)

  const notas = await screen.findAllByRole('article')
  const posiciones = notas.map((nota) => `${nota.style.left}|${nota.style.top}`)
  posiciones.forEach((posicion) => {
    const [left, top] = posicion.split('|')
    expect(left).toMatch(/^\d+px$/)
    expect(top).toMatch(/^\d+px$/)
  })
  expect(new Set(posiciones).size).toBe(3)
})

test('al arrastrar una nota y soltarla, se envía el PATCH con su posición inicial más el desplazamiento y se muestra ahí', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') {
      return { ok: true, json: async () => ({ id: 1, title: 'Arrastrable', text: 'a', x: 150, y: 80 }) }
    }
    return { ok: true, json: async () => [{ id: 1, title: 'Arrastrable', text: 'a', x: 100, y: 50 }] }
  })

  render(<App />)
  const nota = (await screen.findByText('Arrastrable')).closest('article')

  fireEvent.pointerDown(asaDe(nota), { clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { clientX: 350, clientY: 230 })
  fireEvent.pointerUp(window, { clientX: 350, clientY: 230 })

  await vi.waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/notes/1/position',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ x: 150, y: 80 }),
      }),
    ),
  )
  expect(nota).toHaveStyle({ left: '150px', top: '80px' })
})

test('al arrastrar una nota más allá del borde superior o izquierdo, su posición se ajusta a 0', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') {
      return { ok: true, json: async () => ({ id: 1, title: 'Al borde', text: 'a', x: 0, y: 0 }) }
    }
    return { ok: true, json: async () => [{ id: 1, title: 'Al borde', text: 'a', x: 40, y: 30 }] }
  })

  render(<App />)
  const nota = (await screen.findByText('Al borde')).closest('article')

  fireEvent.pointerDown(asaDe(nota), { clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { clientX: 100, clientY: 100 })
  expect(nota).toHaveStyle({ left: '0px', top: '0px' })
  fireEvent.pointerUp(window, { clientX: 100, clientY: 100 })

  await vi.waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/notes/1/position',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ x: 0, y: 0 }) }),
    ),
  )
})

test('si falla guardar la posición, se muestra el mensaje y la nota queda donde se soltó', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') {
      return { ok: false, status: 500, json: async () => ({}) }
    }
    return { ok: true, json: async () => [{ id: 1, title: 'Falla', text: 'a', x: 100, y: 50 }] }
  })

  render(<App />)
  const nota = (await screen.findByText('Falla')).closest('article')

  fireEvent.pointerDown(asaDe(nota), { clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { clientX: 350, clientY: 230 })
  fireEvent.pointerUp(window, { clientX: 350, clientY: 230 })

  expect(await screen.findByText('No se pudo guardar la posición.')).toBeInTheDocument()
  expect(nota).toHaveStyle({ left: '150px', top: '80px' })
})

test('después de un error al guardar la posición, al mover otra vez y funcionar, el mensaje desaparece', async () => {
  let intentos = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') {
      intentos += 1
      if (intentos === 1) return { ok: false, status: 500, json: async () => ({}) }
      return { ok: true, json: async () => ({ id: 1, title: 'Reintenta', text: 'a', x: 200, y: 130 }) }
    }
    return { ok: true, json: async () => [{ id: 1, title: 'Reintenta', text: 'a', x: 100, y: 50 }] }
  })

  render(<App />)
  const nota = (await screen.findByText('Reintenta')).closest('article')

  fireEvent.pointerDown(asaDe(nota), { clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { clientX: 350, clientY: 230 })
  fireEvent.pointerUp(window, { clientX: 350, clientY: 230 })
  expect(await screen.findByText('No se pudo guardar la posición.')).toBeInTheDocument()

  fireEvent.pointerDown(asaDe(nota), { clientX: 350, clientY: 230, button: 0 })
  fireEvent.pointerMove(window, { clientX: 400, clientY: 280 })
  fireEvent.pointerUp(window, { clientX: 400, clientY: 280 })

  await vi.waitFor(() => expect(intentos).toBe(2))
  await vi.waitFor(() =>
    expect(screen.queryByText('No se pudo guardar la posición.')).not.toBeInTheDocument(),
  )
})

test('al arrastrar cerca de los bordes de la ventana, la página se desplaza en esa dirección', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return { ok: true, json: async () => [{ id: 1, title: 'Cerca del borde', text: 'a', x: 100, y: 50 }] }
  })
  const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})

  render(<App />)
  const nota = (await screen.findByText('Cerca del borde')).closest('article')

  fireEvent.pointerDown(asaDe(nota), { clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { clientX: window.innerWidth - 10, clientY: window.innerHeight - 10 })
  const [dxAbajoDerecha, dyAbajoDerecha] = scrollBy.mock.calls.at(-1)
  expect(dxAbajoDerecha).toBeGreaterThan(0)
  expect(dyAbajoDerecha).toBeGreaterThan(0)

  fireEvent.pointerMove(window, { clientX: 10, clientY: 10 })
  const [dxArribaIzquierda, dyArribaIzquierda] = scrollBy.mock.calls.at(-1)
  expect(dxArribaIzquierda).toBeLessThan(0)
  expect(dyArribaIzquierda).toBeLessThan(0)

  scrollBy.mockClear()
  fireEvent.pointerMove(window, { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 })
  expect(scrollBy).not.toHaveBeenCalled()
  fireEvent.pointerUp(window, { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 })
})

test('si la página se desplaza durante el arrastre, la nota sigue al puntero', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return { ok: true, json: async () => [{ id: 1, title: 'Con scroll', text: 'a', x: 100, y: 50 }] }
  })

  render(<App />)
  const nota = (await screen.findByText('Con scroll')).closest('article')

  fireEvent.pointerDown(asaDe(nota), { clientX: 300, clientY: 200, button: 0 })
  Object.defineProperty(window, 'scrollX', { value: 60, configurable: true })
  Object.defineProperty(window, 'scrollY', { value: 100, configurable: true })
  try {
    fireEvent.pointerMove(window, { clientX: 350, clientY: 230 })

    // 100 + 50 (ratón) + 60 (scroll) y 50 + 30 (ratón) + 100 (scroll)
    expect(nota).toHaveStyle({ left: '210px', top: '180px' })
    fireEvent.pointerUp(window, { clientX: 350, clientY: 230 })
  } finally {
    Object.defineProperty(window, 'scrollX', { value: 0, configurable: true })
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  }
})

test('un clic con el botón derecho o central no inicia el arrastre', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return { ok: true, json: async () => [{ id: 1, title: 'Solo izquierdo', text: 'a', x: 100, y: 50 }] }
  })

  render(<App />)
  const nota = (await screen.findByText('Solo izquierdo')).closest('article')

  for (const button of [1, 2]) {
    fireEvent.pointerDown(asaDe(nota), { clientX: 300, clientY: 200, button })
    fireEvent.pointerMove(window, { clientX: 350, clientY: 230 })
    fireEvent.pointerUp(window, { clientX: 350, clientY: 230 })
  }

  expect(nota).toHaveStyle({ left: '100px', top: '50px' })
  const patches = fetch.mock.calls.filter(([, options]) => options?.method === 'PATCH')
  expect(patches).toHaveLength(0)
})

test('si el navegador cancela el gesto, el arrastre termina y se guarda la posición actual', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return { ok: true, json: async () => [{ id: 1, title: 'Cancelada', text: 'a', x: 100, y: 50 }] }
  })

  render(<App />)
  const nota = (await screen.findByText('Cancelada')).closest('article')

  fireEvent.pointerDown(asaDe(nota), { clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { clientX: 350, clientY: 230 })
  fireEvent.pointerCancel(window, { clientX: 350, clientY: 230 })

  await vi.waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/notes/1/position',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ x: 150, y: 80 }) }),
    ),
  )
  // Ya no sigue al puntero tras la cancelación
  fireEvent.pointerMove(window, { clientX: 500, clientY: 500 })
  expect(nota).toHaveStyle({ left: '150px', top: '80px' })
  expect(nota).not.toHaveClass('dragging')
})

test('al arrastrar muy lejos, la posición se limita a 100000 en cada eje', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return { ok: true, json: async () => [{ id: 1, title: 'Muy lejos', text: 'a', x: 99990, y: 99990 }] }
  })

  render(<App />)
  const nota = (await screen.findByText('Muy lejos')).closest('article')

  fireEvent.pointerDown(asaDe(nota), { clientX: 0, clientY: 0, button: 0 })
  fireEvent.pointerMove(window, { clientX: 5000, clientY: 5000 })
  expect(nota).toHaveStyle({ left: '100000px', top: '100000px' })
  fireEvent.pointerUp(window, { clientX: 5000, clientY: 5000 })

  await vi.waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/notes/1/position',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ x: 100000, y: 100000 }) }),
    ),
  )
})

test('arrastrar desde el asa con un puntero táctil mueve la nota y envía el PATCH con su posición final', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return { ok: true, json: async () => [{ id: 1, title: 'Con asa', text: 'a', x: 100, y: 50 }] }
  })

  render(<App />)
  const nota = (await screen.findByText('Con asa')).closest('article')
  const asa = within(nota).getByLabelText('Mover nota')
  const dedo = { pointerId: 7, pointerType: 'touch' }

  fireEvent.pointerDown(asa, { ...dedo, clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { ...dedo, clientX: 340, clientY: 260 })
  fireEvent.pointerUp(window, { ...dedo, clientX: 340, clientY: 260 })

  await vi.waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/notes/1/position',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ x: 140, y: 110 }) }),
    ),
  )
  expect(nota).toHaveStyle({ left: '140px', top: '110px' })
})

test('pulsar y arrastrar desde otra parte de la nota no la mueve ni envía ningún PATCH', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return { ok: true, json: async () => [{ id: 1, title: 'Título fijo', text: 'Texto fijo', x: 100, y: 50 }] }
  })

  render(<App />)
  const nota = (await screen.findByText('Título fijo')).closest('article')
  const dedo = { pointerId: 3, pointerType: 'touch' }

  for (const zona of [screen.getByText('Título fijo'), screen.getByText('Texto fijo'), nota]) {
    fireEvent.pointerDown(zona, { ...dedo, clientX: 300, clientY: 200, button: 0 })
    fireEvent.pointerMove(window, { ...dedo, clientX: 360, clientY: 280 })
    fireEvent.pointerUp(window, { ...dedo, clientX: 360, clientY: 280 })
  }

  expect(nota).toHaveStyle({ left: '100px', top: '50px' })
  const patches = fetch.mock.calls.filter(([, options]) => options?.method === 'PATCH')
  expect(patches).toHaveLength(0)
})

test('mientras un puntero arrastra una nota, un segundo puntero se ignora', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return {
      ok: true,
      json: async () => [
        { id: 1, title: 'Primera', text: 'a', x: 100, y: 50 },
        { id: 2, title: 'Segunda', text: 'b', x: 400, y: 50 },
      ],
    }
  })

  render(<App />)
  const primera = (await screen.findByText('Primera')).closest('article')
  const segunda = screen.getByText('Segunda').closest('article')
  const dedo1 = { pointerId: 1, pointerType: 'touch' }
  const dedo2 = { pointerId: 2, pointerType: 'touch' }

  fireEvent.pointerDown(asaDe(primera), { ...dedo1, clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { ...dedo1, clientX: 340, clientY: 260 })
  expect(primera).toHaveStyle({ left: '140px', top: '110px' })

  // Segundo dedo: baja sobre la otra nota, se mueve y se levanta
  fireEvent.pointerDown(asaDe(segunda), { ...dedo2, clientX: 600, clientY: 100, button: 0 })
  fireEvent.pointerMove(window, { ...dedo2, clientX: 800, clientY: 500 })
  fireEvent.pointerUp(window, { ...dedo2, clientX: 800, clientY: 500 })

  expect(primera).toHaveStyle({ left: '140px', top: '110px' })
  expect(segunda).toHaveStyle({ left: '400px', top: '50px' })
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'PATCH')).toHaveLength(0)

  // El primer dedo sigue mandando y al levantarlo se guarda solo su nota
  fireEvent.pointerUp(window, { ...dedo1, clientX: 340, clientY: 260 })
  await vi.waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/notes/1/position',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ x: 140, y: 110 }) }),
    ),
  )
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'PATCH')).toHaveLength(1)
})

test('al cambiar el tamaño de la ventana, las notas sin posición pasan al nuevo número de columnas', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () =>
      [1, 2, 3, 4, 5].map((n) => ({ id: n, title: `Nota ${n}`, text: 'a', x: null, y: null })),
  })
  let ancho = 1000
  const original = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')
  Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => ancho })

  try {
    render(<App />)
    const notas = await screen.findAllByRole('article')

    // 1000 px de ancho: caben 4 columnas de 220 px con huecos de 24 px
    expect(notas[3]).toHaveStyle({ left: '732px', top: '0px' })
    expect(notas[4]).toHaveStyle({ left: '0px', top: '244px' })

    ancho = 300
    fireEvent(window, new Event('resize'))

    // 300 px de ancho: cabe 1 columna
    await vi.waitFor(() => expect(notas[3]).toHaveStyle({ left: '0px', top: '732px' }))
    expect(notas[4]).toHaveStyle({ left: '0px', top: '976px' })
  } finally {
    Object.defineProperty(Element.prototype, 'clientWidth', original)
  }
})

test('al cambiar el tamaño de la ventana, las notas con posición guardada no se mueven', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [
      { id: 1, title: 'Fija', text: 'a', x: 500, y: 300 },
      { id: 2, title: 'Sin mover 1', text: 'b', x: null, y: null },
      { id: 3, title: 'Sin mover 2', text: 'c', x: null, y: null },
    ],
  })
  let ancho = 1000
  const original = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')
  Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => ancho })

  try {
    render(<App />)
    const fija = (await screen.findByText('Fija')).closest('article')
    const sinMover = screen.getByText('Sin mover 2').closest('article')
    // 1000 px: 4 columnas, la tercera nota (índice 2) queda en la tercera columna
    expect(sinMover).toHaveStyle({ left: '488px', top: '0px' })

    ancho = 300
    fireEvent(window, new Event('resize'))

    // La nota sin mover sí se recoloca (1 columna: tercer hueco, abajo)...
    await vi.waitFor(() => expect(sinMover).toHaveStyle({ left: '0px', top: '488px' }))
    // ...y la que tiene posición guardada no se mueve
    expect(fija).toHaveStyle({ left: '500px', top: '300px' })
  } finally {
    Object.defineProperty(Element.prototype, 'clientWidth', original)
  }
})

test('si la ventana pierde el foco durante un arrastre, termina y se guarda la posición actual', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return { ok: true, json: async () => [{ id: 1, title: 'Sin foco', text: 'a', x: 100, y: 50 }] }
  })

  render(<App />)
  const nota = (await screen.findByText('Sin foco')).closest('article')

  fireEvent.pointerDown(asaDe(nota), { pointerId: 4, clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { pointerId: 4, clientX: 350, clientY: 230 })
  fireEvent.blur(window)

  await vi.waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/notes/1/position',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ x: 150, y: 80 }) }),
    ),
  )
  // El arrastre terminó: el puntero ya no mueve la nota...
  fireEvent.pointerMove(window, { pointerId: 4, clientX: 500, clientY: 500 })
  expect(nota).toHaveStyle({ left: '150px', top: '80px' })

  // ...y se puede arrastrar otra vez (no queda atascado)
  fireEvent.pointerDown(asaDe(nota), { pointerId: 5, clientX: 350, clientY: 230, button: 0 })
  fireEvent.pointerMove(window, { pointerId: 5, clientX: 400, clientY: 280 })
  expect(nota).toHaveStyle({ left: '200px', top: '130px' })
  fireEvent.pointerUp(window, { pointerId: 5, clientX: 400, clientY: 280 })
})

test('al pulsar el icono de editar, la nota muestra los campos con el título y el texto actuales', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, title: 'Título actual', text: 'Texto actual', x: 100, y: 50 }],
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Título actual')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Editar nota' }))

  expect(within(nota).getByLabelText('Título de la nota')).toHaveValue('Título actual')
  expect(within(nota).getByLabelText('Texto de la nota')).toHaveValue('Texto actual')
  expect(within(nota).getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  expect(within(nota).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
})

test('al guardar, se envía el PUT con los valores nuevos y la nota vuelve a modo lectura con ellos, en la misma posición', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PUT') {
      return { ok: true, json: async () => ({ id: 1, title: 'Título nuevo', text: 'Texto nuevo', x: 100, y: 50 }) }
    }
    return { ok: true, json: async () => [{ id: 1, title: 'Título viejo', text: 'Texto viejo', x: 100, y: 50 }] }
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Título viejo')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Editar nota' }))
  await user.clear(within(nota).getByLabelText('Título de la nota'))
  await user.type(within(nota).getByLabelText('Título de la nota'), 'Título nuevo')
  await user.clear(within(nota).getByLabelText('Texto de la nota'))
  await user.type(within(nota).getByLabelText('Texto de la nota'), 'Texto nuevo')
  await user.click(within(nota).getByRole('button', { name: 'Guardar' }))

  expect(await within(nota).findByText('Título nuevo')).toBeInTheDocument()
  expect(within(nota).getByText('Texto nuevo')).toBeInTheDocument()
  expect(within(nota).queryByLabelText('Título de la nota')).not.toBeInTheDocument()
  expect(within(nota).getByRole('button', { name: 'Editar nota' })).toBeInTheDocument()
  expect(nota).toHaveStyle({ left: '100px', top: '50px' })
  expect(fetch).toHaveBeenCalledWith(
    '/api/notes/1',
    expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ title: 'Título nuevo', text: 'Texto nuevo' }),
    }),
  )
})

test('con el título vacío, Guardar no envía nada y la nota sigue en modo edición con lo escrito', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, title: 'Con título', text: 'Texto original', x: 100, y: 50 }],
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Con título')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Editar nota' }))
  await user.clear(within(nota).getByLabelText('Título de la nota'))
  await user.type(within(nota).getByLabelText('Texto de la nota'), ' editado')
  await user.click(within(nota).getByRole('button', { name: 'Guardar' }))
  // También con solo espacios
  await user.type(within(nota).getByLabelText('Título de la nota'), '   ')
  await user.click(within(nota).getByRole('button', { name: 'Guardar' }))

  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(0)
  expect(within(nota).getByLabelText('Título de la nota')).toHaveValue('   ')
  expect(within(nota).getByLabelText('Texto de la nota')).toHaveValue('Texto original editado')
  expect(within(nota).getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
})

test('Cancelar restaura el título y el texto anteriores sin enviar nada', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, title: 'Original', text: 'Texto original', x: 100, y: 50 }],
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Original')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Editar nota' }))
  await user.clear(within(nota).getByLabelText('Título de la nota'))
  await user.type(within(nota).getByLabelText('Título de la nota'), 'Cambiado')
  await user.type(within(nota).getByLabelText('Texto de la nota'), ' cambiado')
  await user.click(within(nota).getByRole('button', { name: 'Cancelar' }))

  expect(within(nota).getByText('Original')).toBeInTheDocument()
  expect(within(nota).getByText('Texto original')).toBeInTheDocument()
  expect(within(nota).queryByLabelText('Título de la nota')).not.toBeInTheDocument()
  expect(within(nota).queryByText('Cambiado')).not.toBeInTheDocument()
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(0)

  // Al volver a editar, los campos parten de los valores originales, no de lo descartado
  await user.click(within(nota).getByRole('button', { name: 'Editar nota' }))
  expect(within(nota).getByLabelText('Título de la nota')).toHaveValue('Original')
  expect(within(nota).getByLabelText('Texto de la nota')).toHaveValue('Texto original')
})

test('si falla guardar los cambios, se muestra el mensaje y la nota sigue en modo edición con lo escrito', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PUT') return { ok: false, status: 500, json: async () => ({}) }
    return { ok: true, json: async () => [{ id: 1, title: 'Original', text: 'Texto original', x: 100, y: 50 }] }
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Original')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Editar nota' }))
  await user.type(within(nota).getByLabelText('Título de la nota'), ' editado')
  await user.click(within(nota).getByRole('button', { name: 'Guardar' }))

  expect(await screen.findByText('No se pudieron guardar los cambios.')).toBeInTheDocument()
  expect(within(nota).getByLabelText('Título de la nota')).toHaveValue('Original editado')
  expect(within(nota).getByLabelText('Texto de la nota')).toHaveValue('Texto original')
  expect(within(nota).getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
})

test('después de un error al guardar los cambios, al guardar de nuevo y funcionar, el mensaje desaparece', async () => {
  let intentos = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PUT') {
      intentos += 1
      if (intentos === 1) return { ok: false, status: 500, json: async () => ({}) }
      return { ok: true, json: async () => ({ id: 1, title: 'Original editado', text: 'Texto', x: 100, y: 50 }) }
    }
    return { ok: true, json: async () => [{ id: 1, title: 'Original', text: 'Texto', x: 100, y: 50 }] }
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Original')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Editar nota' }))
  await user.type(within(nota).getByLabelText('Título de la nota'), ' editado')
  await user.click(within(nota).getByRole('button', { name: 'Guardar' }))
  expect(await screen.findByText('No se pudieron guardar los cambios.')).toBeInTheDocument()

  await user.click(within(nota).getByRole('button', { name: 'Guardar' }))

  expect(await within(nota).findByText('Original editado')).toBeInTheDocument()
  expect(screen.queryByText('No se pudieron guardar los cambios.')).not.toBeInTheDocument()
})

test('los campos de edición limitan el título a 100 y el texto a 1000 caracteres', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, title: 'Corta', text: 'Texto', x: 100, y: 50 }],
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Corta')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Editar nota' }))
  const titulo = within(nota).getByLabelText('Título de la nota')
  const texto = within(nota).getByLabelText('Texto de la nota')

  expect(titulo).toHaveAttribute('maxlength', '100')
  expect(texto).toHaveAttribute('maxlength', '1000')
  await user.clear(titulo)
  await user.type(titulo, 'a'.repeat(101))
  expect(titulo.value).toHaveLength(100)
})

test('si se arrastra la nota mientras el PUT está en vuelo, la respuesta no deshace el movimiento', async () => {
  let resolverPut
  vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) => {
    if (options?.method === 'PUT') {
      return new Promise((resolve) => {
        // El servidor responde con la posición vieja (100, 50)
        resolverPut = () =>
          resolve({ ok: true, json: async () => ({ id: 1, title: 'Título nuevo', text: 'a', x: 100, y: 50 }) })
      })
    }
    if (options?.method === 'PATCH') return Promise.resolve({ ok: true, json: async () => ({}) })
    return Promise.resolve({ ok: true, json: async () => [{ id: 1, title: 'Título viejo', text: 'a', x: 100, y: 50 }] })
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Título viejo')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Editar nota' }))
  await user.clear(within(nota).getByLabelText('Título de la nota'))
  await user.type(within(nota).getByLabelText('Título de la nota'), 'Título nuevo')
  await user.click(within(nota).getByRole('button', { name: 'Guardar' }))

  // Mientras el PUT está pendiente, el usuario arrastra la nota
  fireEvent.pointerDown(asaDe(nota), { pointerId: 1, clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 350, clientY: 230 })
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 350, clientY: 230 })
  expect(nota).toHaveStyle({ left: '150px', top: '80px' })

  resolverPut()
  expect(await within(nota).findByText('Título nuevo')).toBeInTheDocument()
  expect(nota).toHaveStyle({ left: '150px', top: '80px' })
})

test('mientras se guardan los cambios, Guardar y Cancelar están deshabilitados y un doble clic envía un solo PUT', async () => {
  let resolverPut
  vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) => {
    if (options?.method === 'PUT') {
      return new Promise((resolve) => {
        resolverPut = () =>
          resolve({ ok: true, json: async () => ({ id: 1, title: 'Editada', text: 'a', x: 100, y: 50 }) })
      })
    }
    return Promise.resolve({ ok: true, json: async () => [{ id: 1, title: 'Original', text: 'a', x: 100, y: 50 }] })
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Original')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Editar nota' }))
  await user.type(within(nota).getByLabelText('Título de la nota'), ' x')
  const guardar = within(nota).getByRole('button', { name: 'Guardar' })
  const cancelar = within(nota).getByRole('button', { name: 'Cancelar' })
  expect(guardar).toBeEnabled()

  await user.click(guardar)
  await user.click(guardar)

  expect(guardar).toBeDisabled()
  expect(cancelar).toBeDisabled()
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(1)

  resolverPut()
  expect(await within(nota).findByText('Editada')).toBeInTheDocument()
})

test('mientras una nota se edita, los lápices de las otras notas están deshabilitados', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [
      { id: 1, title: 'Primera', text: 'a', x: 100, y: 50 },
      { id: 2, title: 'Segunda', text: 'b', x: 400, y: 50 },
    ],
  })
  const user = userEvent.setup()

  render(<App />)
  const primera = (await screen.findByText('Primera')).closest('article')
  const segunda = screen.getByText('Segunda').closest('article')
  expect(within(segunda).getByRole('button', { name: 'Editar nota' })).toBeEnabled()

  await user.click(within(primera).getByRole('button', { name: 'Editar nota' }))
  expect(within(segunda).getByRole('button', { name: 'Editar nota' })).toBeDisabled()

  await user.click(within(primera).getByRole('button', { name: 'Cancelar' }))
  expect(within(segunda).getByRole('button', { name: 'Editar nota' })).toBeEnabled()
})

test('después de un error al guardar los cambios, Cancelar quita el aviso', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PUT') return { ok: false, status: 500, json: async () => ({}) }
    return { ok: true, json: async () => [{ id: 1, title: 'Original', text: 'a', x: 100, y: 50 }] }
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Original')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Editar nota' }))
  await user.type(within(nota).getByLabelText('Título de la nota'), ' x')
  await user.click(within(nota).getByRole('button', { name: 'Guardar' }))
  expect(await screen.findByText('No se pudieron guardar los cambios.')).toBeInTheDocument()

  await user.click(within(nota).getByRole('button', { name: 'Cancelar' }))

  expect(screen.queryByText('No se pudieron guardar los cambios.')).not.toBeInTheDocument()
})

test('al pulsar la papelera, la nota muestra la confirmación con Eliminar y Cancelar sin enviar nada', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, title: 'A eliminar', text: 'Texto', x: 100, y: 50 }],
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('A eliminar')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Eliminar nota' }))

  expect(within(nota).getByText('¿Eliminar esta nota?')).toBeInTheDocument()
  expect(within(nota).getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  expect(within(nota).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(0)
})

test('al confirmar, se envía el DELETE y la nota desaparece; las demás conservan su posición', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'DELETE') return { ok: true, status: 204 }
    return {
      ok: true,
      json: async () => [
        { id: 1, title: 'Primera', text: 'a', x: 100, y: 50 },
        { id: 2, title: 'Segunda', text: 'b', x: 400, y: 60 },
        { id: 3, title: 'Tercera', text: 'c', x: 700, y: 70 },
      ],
    }
  })
  const user = userEvent.setup()

  render(<App />)
  const segunda = (await screen.findByText('Segunda')).closest('article')
  await user.click(within(segunda).getByRole('button', { name: 'Eliminar nota' }))
  await user.click(within(segunda).getByRole('button', { name: 'Eliminar' }))

  await vi.waitFor(() => expect(screen.queryByText('Segunda')).not.toBeInTheDocument())
  expect(fetch).toHaveBeenCalledWith('/api/notes/2', expect.objectContaining({ method: 'DELETE' }))
  expect(screen.getByText('Primera').closest('article')).toHaveStyle({ left: '100px', top: '50px' })
  expect(screen.getByText('Tercera').closest('article')).toHaveStyle({ left: '700px', top: '70px' })
  expect(screen.getAllByRole('article')).toHaveLength(2)
})

test('Cancelar en la confirmación de borrado devuelve la nota a modo lectura sin enviar nada', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, title: 'Se queda', text: 'Texto', x: 100, y: 50 }],
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Se queda')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Eliminar nota' }))
  await user.click(within(nota).getByRole('button', { name: 'Cancelar' }))

  expect(within(nota).queryByText('¿Eliminar esta nota?')).not.toBeInTheDocument()
  expect(within(nota).getByText('Se queda')).toBeInTheDocument()
  expect(within(nota).getByText('Texto')).toBeInTheDocument()
  expect(within(nota).getByRole('button', { name: 'Eliminar nota' })).toBeEnabled()
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(0)
})

test('si falla eliminar, la nota sigue en el board y se muestra el mensaje', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'DELETE') return { ok: false, status: 500 }
    return { ok: true, json: async () => [{ id: 1, title: 'No se borra', text: 'Texto', x: 100, y: 50 }] }
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('No se borra')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Eliminar nota' }))
  await user.click(within(nota).getByRole('button', { name: 'Eliminar' }))

  expect(await screen.findByText('No se pudo eliminar la nota.')).toBeInTheDocument()
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(nota).toHaveStyle({ left: '100px', top: '50px' })
  // La nota se queda en la confirmación, para poder reintentar o cancelar
  expect(within(nota).getByText('¿Eliminar esta nota?')).toBeInTheDocument()
  expect(within(nota).getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  expect(within(nota).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
})

test('después de un error al eliminar, al eliminar de nuevo y funcionar, el mensaje desaparece', async () => {
  let intentos = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'DELETE') {
      intentos += 1
      return intentos === 1 ? { ok: false, status: 500 } : { ok: true, status: 204 }
    }
    return { ok: true, json: async () => [{ id: 1, title: 'Reintento', text: 'Texto', x: 100, y: 50 }] }
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Reintento')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Eliminar nota' }))
  await user.click(within(nota).getByRole('button', { name: 'Eliminar' }))
  expect(await screen.findByText('No se pudo eliminar la nota.')).toBeInTheDocument()

  await user.click(within(nota).getByRole('button', { name: 'Eliminar' }))

  await vi.waitFor(() => expect(screen.queryByRole('article')).not.toBeInTheDocument())
  expect(screen.queryByText('No se pudo eliminar la nota.')).not.toBeInTheDocument()
})

test('mientras se elimina, Eliminar y Cancelar están deshabilitados y un doble clic envía un solo DELETE', async () => {
  let resolverDelete
  vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) => {
    if (options?.method === 'DELETE') {
      return new Promise((resolve) => {
        resolverDelete = () => resolve({ ok: true, status: 204 })
      })
    }
    return Promise.resolve({ ok: true, json: async () => [{ id: 1, title: 'Una vez', text: 'Texto', x: 100, y: 50 }] })
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Una vez')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Eliminar nota' }))
  const eliminar = within(nota).getByRole('button', { name: 'Eliminar' })
  const cancelar = within(nota).getByRole('button', { name: 'Cancelar' })
  expect(eliminar).toBeEnabled()

  await user.click(eliminar)
  await user.click(eliminar)

  expect(eliminar).toBeDisabled()
  expect(cancelar).toBeDisabled()
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(1)

  resolverDelete()
  await vi.waitFor(() => expect(screen.queryByRole('article')).not.toBeInTheDocument())
})

test('mientras una nota se edita, las papeleras de las otras notas están deshabilitadas', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [
      { id: 1, title: 'Primera', text: 'a', x: 100, y: 50 },
      { id: 2, title: 'Segunda', text: 'b', x: 400, y: 50 },
    ],
  })
  const user = userEvent.setup()

  render(<App />)
  const primera = (await screen.findByText('Primera')).closest('article')
  const segunda = screen.getByText('Segunda').closest('article')
  expect(within(segunda).getByRole('button', { name: 'Eliminar nota' })).toBeEnabled()

  await user.click(within(primera).getByRole('button', { name: 'Editar nota' }))
  expect(within(segunda).getByRole('button', { name: 'Eliminar nota' })).toBeDisabled()

  await user.click(within(primera).getByRole('button', { name: 'Cancelar' }))
  expect(within(segunda).getByRole('button', { name: 'Eliminar nota' })).toBeEnabled()
})

test('mientras una nota está en confirmación de borrado, los lápices y papeleras de las otras están deshabilitados', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [
      { id: 1, title: 'Primera', text: 'a', x: 100, y: 50 },
      { id: 2, title: 'Segunda', text: 'b', x: 400, y: 50 },
    ],
  })
  const user = userEvent.setup()

  render(<App />)
  const primera = (await screen.findByText('Primera')).closest('article')
  const segunda = screen.getByText('Segunda').closest('article')
  expect(within(segunda).getByRole('button', { name: 'Editar nota' })).toBeEnabled()
  expect(within(segunda).getByRole('button', { name: 'Eliminar nota' })).toBeEnabled()

  await user.click(within(primera).getByRole('button', { name: 'Eliminar nota' }))
  expect(within(segunda).getByRole('button', { name: 'Editar nota' })).toBeDisabled()
  expect(within(segunda).getByRole('button', { name: 'Eliminar nota' })).toBeDisabled()

  await user.click(within(primera).getByRole('button', { name: 'Cancelar' }))
  expect(within(segunda).getByRole('button', { name: 'Editar nota' })).toBeEnabled()
  expect(within(segunda).getByRole('button', { name: 'Eliminar nota' })).toBeEnabled()
})

test('al eliminar una nota sin posición, las que van detrás en la cuadrícula ocupan el hueco', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'DELETE') return { ok: true, status: 204 }
    return {
      ok: true,
      json: async () =>
        [1, 2, 3].map((n) => ({ id: n, title: `Nota ${n}`, text: 'a', x: null, y: null })),
    }
  })
  const original = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')
  Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => 1000 })
  const user = userEvent.setup()

  try {
    render(<App />)
    const primera = (await screen.findByText('Nota 1')).closest('article')
    // 1000 px: 4 columnas; las tres notas ocupan los huecos 0, 1 y 2 de la primera fila
    expect(screen.getByText('Nota 2').closest('article')).toHaveStyle({ left: '244px', top: '0px' })
    expect(screen.getByText('Nota 3').closest('article')).toHaveStyle({ left: '488px', top: '0px' })

    await user.click(within(primera).getByRole('button', { name: 'Eliminar nota' }))
    await user.click(within(primera).getByRole('button', { name: 'Eliminar' }))

    await vi.waitFor(() => expect(screen.queryByText('Nota 1')).not.toBeInTheDocument())
    expect(screen.getByText('Nota 2').closest('article')).toHaveStyle({ left: '0px', top: '0px' })
    expect(screen.getByText('Nota 3').closest('article')).toHaveStyle({ left: '244px', top: '0px' })
  } finally {
    Object.defineProperty(Element.prototype, 'clientWidth', original)
  }
})

test('después de un error al eliminar, Cancelar quita el aviso', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'DELETE') return { ok: false, status: 500 }
    return { ok: true, json: async () => [{ id: 1, title: 'Se queda', text: 'Texto', x: 100, y: 50 }] }
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Se queda')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Eliminar nota' }))
  await user.click(within(nota).getByRole('button', { name: 'Eliminar' }))
  expect(await screen.findByText('No se pudo eliminar la nota.')).toBeInTheDocument()

  await user.click(within(nota).getByRole('button', { name: 'Cancelar' }))

  expect(screen.queryByText('No se pudo eliminar la nota.')).not.toBeInTheDocument()
  expect(within(nota).getByText('Se queda')).toBeInTheDocument()
})

test('una nota en confirmación de borrado no se puede arrastrar', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return { ok: true, json: async () => [{ id: 1, title: 'Quieta', text: 'Texto', x: 100, y: 50 }] }
  })
  const user = userEvent.setup()

  render(<App />)
  const nota = (await screen.findByText('Quieta')).closest('article')
  await user.click(within(nota).getByRole('button', { name: 'Eliminar nota' }))

  fireEvent.pointerDown(asaDe(nota), { pointerId: 1, clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 350, clientY: 230 })
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 350, clientY: 230 })

  expect(nota).toHaveStyle({ left: '100px', top: '50px' })
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'PATCH')).toHaveLength(0)
})

test('al pulsar +, aparece una nota en blanco en el siguiente hueco de la cuadrícula, en modo edición', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [
      { id: 1, title: 'Primera', text: 'a', x: null, y: null },
      { id: 2, title: 'Segunda', text: 'b', x: null, y: null },
    ],
  })
  const original = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')
  Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => 1000 })
  const user = userEvent.setup()

  try {
    render(<App />)
    await screen.findByText('Primera')
    await user.click(screen.getByRole('button', { name: 'Agregar nota' }))

    const notas = screen.getAllByRole('article')
    expect(notas).toHaveLength(3)
    const nueva = notas[2]
    // 1000 px: 4 columnas; las dos notas ocupan los huecos 0 y 1, la nueva el 2
    expect(nueva).toHaveStyle({ left: '488px', top: '0px' })
    expect(within(nueva).getByLabelText('Título de la nota')).toHaveValue('')
    expect(within(nueva).getByLabelText('Texto de la nota')).toHaveValue('')
    expect(within(nueva).getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
    expect(within(nueva).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  } finally {
    Object.defineProperty(Element.prototype, 'clientWidth', original)
  }
})

test('al aparecer la nota en blanco, el campo de título tiene el foco', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, title: 'Existente', text: 'a', x: 100, y: 50 }],
  })
  const user = userEvent.setup()

  render(<App />)
  await screen.findByText('Existente')
  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))

  const nueva = screen.getAllByRole('article')[1]
  expect(within(nueva).getByLabelText('Título de la nota')).toHaveFocus()
})

test('al aparecer la nota en blanco, la página se desplaza hasta ella', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, title: 'Existente', text: 'a', x: 100, y: 50 }],
  })
  const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')
  const user = userEvent.setup()

  render(<App />)
  await screen.findByText('Existente')
  expect(scrollIntoView).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))

  const nueva = screen.getAllByRole('article')[1]
  expect(scrollIntoView).toHaveBeenCalledTimes(1)
  expect(scrollIntoView.mock.contexts[0]).toBe(nueva)
})

test('con la nota en blanco, el + y los iconos de las demás notas están deshabilitados', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, title: 'Existente', text: 'a', x: 100, y: 50 }],
  })
  const user = userEvent.setup()

  render(<App />)
  const existente = (await screen.findByText('Existente')).closest('article')
  const mas = screen.getByRole('button', { name: 'Agregar nota' })
  expect(mas).toBeEnabled()
  expect(within(existente).getByRole('button', { name: 'Editar nota' })).toBeEnabled()
  expect(within(existente).getByRole('button', { name: 'Eliminar nota' })).toBeEnabled()

  await user.click(mas)

  expect(mas).toBeDisabled()
  expect(within(existente).getByRole('button', { name: 'Editar nota' })).toBeDisabled()
  expect(within(existente).getByRole('button', { name: 'Eliminar nota' })).toBeDisabled()
})

test('al guardar la nota en blanco con título y texto, se envía el POST y pasa a ser una nota normal en el mismo hueco', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'POST') {
      return { ok: true, json: async () => ({ id: 9, title: 'Nota nueva', text: 'Con texto', x: null, y: null }) }
    }
    return {
      ok: true,
      json: async () => [
        { id: 1, title: 'Primera', text: 'a', x: null, y: null },
        { id: 2, title: 'Segunda', text: 'b', x: null, y: null },
      ],
    }
  })
  const original = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')
  Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => 1000 })
  const user = userEvent.setup()

  try {
    render(<App />)
    await screen.findByText('Primera')
    await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
    const nueva = screen.getAllByRole('article')[2]
    await user.type(within(nueva).getByLabelText('Título de la nota'), 'Nota nueva')
    await user.type(within(nueva).getByLabelText('Texto de la nota'), 'Con texto')
    await user.click(within(nueva).getByRole('button', { name: 'Guardar' }))

    const creada = (await screen.findByText('Nota nueva')).closest('article')
    expect(within(creada).getByText('Con texto')).toBeInTheDocument()
    expect(within(creada).queryByLabelText('Título de la nota')).not.toBeInTheDocument()
    expect(within(creada).getByRole('button', { name: 'Editar nota' })).toBeInTheDocument()
    expect(creada).toHaveStyle({ left: '488px', top: '0px' })
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Agregar nota' })).toBeEnabled()
    expect(fetch).toHaveBeenCalledWith(
      '/api/notes',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Nota nueva', text: 'Con texto' }),
      }),
    )
  } finally {
    Object.defineProperty(Element.prototype, 'clientWidth', original)
  }
})

test('al guardar la nota en blanco solo con título, se crea sin texto', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'POST') {
      return { ok: true, json: async () => ({ id: 9, title: 'Solo título', text: '', x: null, y: null }) }
    }
    return { ok: true, json: async () => [] }
  })
  const user = userEvent.setup()

  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
  const nueva = screen.getByRole('article')
  await user.type(within(nueva).getByLabelText('Título de la nota'), 'Solo título')
  await user.click(within(nueva).getByRole('button', { name: 'Guardar' }))

  const creada = (await screen.findByText('Solo título')).closest('article')
  expect(within(creada).getByRole('button', { name: 'Editar nota' })).toBeInTheDocument()
  expect(fetch).toHaveBeenCalledWith(
    '/api/notes',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: 'Solo título', text: '' }),
    }),
  )
})

test('Cancelar descarta la nota en blanco sin enviar nada y el + vuelve a estar habilitado', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, title: 'Existente', text: 'a', x: 100, y: 50 }],
  })
  const user = userEvent.setup()

  render(<App />)
  await screen.findByText('Existente')
  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
  const nueva = screen.getAllByRole('article')[1]
  await user.type(within(nueva).getByLabelText('Título de la nota'), 'Se descarta')
  await user.click(within(nueva).getByRole('button', { name: 'Cancelar' }))

  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.queryByText('Se descarta')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Agregar nota' })).toBeEnabled()
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0)

  // Al volver a pulsar +, la nota en blanco aparece vacía, sin lo que se había escrito
  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
  expect(within(screen.getAllByRole('article')[1]).getByLabelText('Título de la nota')).toHaveValue('')
})

test('Guardar la nota en blanco con el título vacío o de solo espacios no envía nada y sigue en edición con lo escrito', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => [] })
  const user = userEvent.setup()

  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
  const nueva = screen.getByRole('article')
  await user.type(within(nueva).getByLabelText('Texto de la nota'), 'Solo texto')
  await user.click(within(nueva).getByRole('button', { name: 'Guardar' }))
  // También con el título de solo espacios
  await user.type(within(nueva).getByLabelText('Título de la nota'), '   ')
  await user.click(within(nueva).getByRole('button', { name: 'Guardar' }))

  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0)
  expect(within(nueva).getByLabelText('Título de la nota')).toHaveValue('   ')
  expect(within(nueva).getByLabelText('Texto de la nota')).toHaveValue('Solo texto')
  expect(within(nueva).getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
})

test('si falla guardar la nota en blanco, se muestra el aviso y la nota sigue en edición con lo escrito', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'POST') return { ok: false, status: 500, json: async () => ({}) }
    return { ok: true, json: async () => [] }
  })
  const user = userEvent.setup()

  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
  const nueva = screen.getByRole('article')
  await user.type(within(nueva).getByLabelText('Título de la nota'), 'No se guarda')
  await user.type(within(nueva).getByLabelText('Texto de la nota'), 'Texto que se conserva')
  await user.click(within(nueva).getByRole('button', { name: 'Guardar' }))

  expect(await screen.findByText('No se pudo guardar la nota.')).toBeInTheDocument()
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(within(nueva).getByLabelText('Título de la nota')).toHaveValue('No se guarda')
  expect(within(nueva).getByLabelText('Texto de la nota')).toHaveValue('Texto que se conserva')
  expect(within(nueva).getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
})

test('después de un error al guardar la nota en blanco, al guardar de nuevo y funcionar, el aviso desaparece', async () => {
  let intentos = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'POST') {
      intentos += 1
      if (intentos === 1) return { ok: false, status: 500, json: async () => ({}) }
      return { ok: true, json: async () => ({ id: 9, title: 'Reintento', text: '', x: null, y: null }) }
    }
    return { ok: true, json: async () => [] }
  })
  const user = userEvent.setup()

  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
  const nueva = screen.getByRole('article')
  await user.type(within(nueva).getByLabelText('Título de la nota'), 'Reintento')
  await user.click(within(nueva).getByRole('button', { name: 'Guardar' }))
  expect(await screen.findByText('No se pudo guardar la nota.')).toBeInTheDocument()

  await user.click(within(nueva).getByRole('button', { name: 'Guardar' }))

  expect(await screen.findByText('Reintento')).toBeInTheDocument()
  expect(screen.queryByText('No se pudo guardar la nota.')).not.toBeInTheDocument()
})

test('mientras se guarda la nota en blanco, Guardar y Cancelar están deshabilitados y un doble clic envía un solo POST', async () => {
  let resolverPost
  vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) => {
    if (options?.method === 'POST') {
      return new Promise((resolve) => {
        resolverPost = () =>
          resolve({ ok: true, json: async () => ({ id: 9, title: 'Una vez', text: '', x: null, y: null }) })
      })
    }
    return Promise.resolve({ ok: true, json: async () => [] })
  })
  const user = userEvent.setup()

  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
  const nueva = screen.getByRole('article')
  await user.type(within(nueva).getByLabelText('Título de la nota'), 'Una vez')
  const guardar = within(nueva).getByRole('button', { name: 'Guardar' })
  const cancelar = within(nueva).getByRole('button', { name: 'Cancelar' })
  expect(guardar).toBeEnabled()

  await user.click(guardar)
  await user.click(guardar)

  expect(guardar).toBeDisabled()
  expect(cancelar).toBeDisabled()
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1)

  resolverPost()
  expect(await screen.findByText('Una vez')).toBeInTheDocument()
})

test('la nota en blanco no se puede arrastrar', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return { ok: true, json: async () => [{ id: 1, title: 'Existente', text: 'a', x: 100, y: 50 }] }
  })
  const user = userEvent.setup()

  render(<App />)
  await screen.findByText('Existente')
  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
  const nueva = screen.getAllByRole('article')[1]
  // Sin ancho medido cabe 1 columna: la nota en blanco es el segundo hueco
  expect(nueva).toHaveStyle({ left: '0px', top: '244px' })

  fireEvent.pointerDown(asaDe(nueva), { pointerId: 1, clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 350, clientY: 230 })
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 350, clientY: 230 })

  expect(nueva).toHaveStyle({ left: '0px', top: '244px' })
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'PATCH')).toHaveLength(0)
})

test('los campos de la nota en blanco limitan el título a 100 y el texto a 1000 caracteres', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => [] })
  const user = userEvent.setup()

  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
  const nueva = screen.getByRole('article')
  const titulo = within(nueva).getByLabelText('Título de la nota')
  const texto = within(nueva).getByLabelText('Texto de la nota')

  expect(titulo).toHaveAttribute('maxlength', '100')
  expect(texto).toHaveAttribute('maxlength', '1000')
  await user.type(titulo, 'a'.repeat(101))
  expect(titulo.value).toHaveLength(100)
})

test('después de un error al guardar la nota en blanco, Cancelar quita el aviso', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'POST') return { ok: false, status: 500, json: async () => ({}) }
    return { ok: true, json: async () => [] }
  })
  const user = userEvent.setup()

  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
  const nueva = screen.getByRole('article')
  await user.type(within(nueva).getByLabelText('Título de la nota'), 'Falla')
  await user.click(within(nueva).getByRole('button', { name: 'Guardar' }))
  expect(await screen.findByText('No se pudo guardar la nota.')).toBeInTheDocument()

  await user.click(within(nueva).getByRole('button', { name: 'Cancelar' }))

  expect(screen.queryByText('No se pudo guardar la nota.')).not.toBeInTheDocument()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
})

test('mientras hay una nota en blanco, las demás notas no se pueden arrastrar', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return { ok: true, json: async () => [{ id: 1, title: 'Existente', text: 'a', x: 100, y: 50 }] }
  })
  const user = userEvent.setup()

  render(<App />)
  const existente = (await screen.findByText('Existente')).closest('article')

  // Sin nota en blanco sí se arrastra
  fireEvent.pointerDown(asaDe(existente), { pointerId: 1, clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 320, clientY: 210 })
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 320, clientY: 210 })
  expect(existente).toHaveStyle({ left: '120px', top: '60px' })

  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
  fireEvent.pointerDown(asaDe(existente), { pointerId: 2, clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { pointerId: 2, clientX: 400, clientY: 300 })
  fireEvent.pointerUp(window, { pointerId: 2, clientX: 400, clientY: 300 })

  expect(existente).toHaveStyle({ left: '120px', top: '60px' })
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'PATCH')).toHaveLength(1)
})

test('la nota en blanco queda por encima de la última nota que se movió', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return { ok: true, json: async () => [{ id: 1, title: 'Movida', text: 'a', x: 100, y: 50 }] }
  })
  const user = userEvent.setup()

  render(<App />)
  const movida = (await screen.findByText('Movida')).closest('article')
  fireEvent.pointerDown(asaDe(movida), { pointerId: 1, clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 320, clientY: 210 })
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 320, clientY: 210 })
  // La última nota movida queda encima de las demás
  expect(movida).toHaveStyle({ zIndex: '1' })

  await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
  const nueva = screen.getAllByRole('article')[1]

  expect(nueva).toHaveStyle({ zIndex: '1' })
  expect(movida).toHaveStyle({ zIndex: '0' })
})

test('al abrir el board no hay formulario de título y texto ni botón Agregar, y sí está el botón +', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [{ id: 1, title: 'Existente', text: 'a', x: 0, y: 0 }],
  })

  const { container } = render(<App />)
  await screen.findByText('Existente')

  expect(container.querySelector('form')).toBeNull()
  expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Texto')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Agregar' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Agregar nota' })).toBeEnabled()
})

test('mientras una nota se edita, las demás notas no se pueden arrastrar', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return {
      ok: true,
      json: async () => [
        { id: 1, title: 'En edición', text: 'a', x: 100, y: 50 },
        { id: 2, title: 'Otra', text: 'b', x: 400, y: 50 },
      ],
    }
  })
  const user = userEvent.setup()

  render(<App />)
  const enEdicion = (await screen.findByText('En edición')).closest('article')
  const otra = screen.getByText('Otra').closest('article')
  await user.click(within(enEdicion).getByRole('button', { name: 'Editar nota' }))

  fireEvent.pointerDown(asaDe(otra), { pointerId: 1, clientX: 500, clientY: 100, button: 0 })
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 560, clientY: 160 })
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 560, clientY: 160 })

  expect(otra).toHaveStyle({ left: '400px', top: '50px' })
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'PATCH')).toHaveLength(0)
})

test('mientras una nota está en confirmación de borrado, las demás notas no se pueden arrastrar', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'PATCH') return { ok: true, json: async () => ({}) }
    return {
      ok: true,
      json: async () => [
        { id: 1, title: 'A eliminar', text: 'a', x: 100, y: 50 },
        { id: 2, title: 'Otra', text: 'b', x: 400, y: 50 },
      ],
    }
  })
  const user = userEvent.setup()

  render(<App />)
  const aEliminar = (await screen.findByText('A eliminar')).closest('article')
  const otra = screen.getByText('Otra').closest('article')
  await user.click(within(aEliminar).getByRole('button', { name: 'Eliminar nota' }))

  fireEvent.pointerDown(asaDe(otra), { pointerId: 1, clientX: 500, clientY: 100, button: 0 })
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 560, clientY: 160 })
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 560, clientY: 160 })

  expect(otra).toHaveStyle({ left: '400px', top: '50px' })
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'PATCH')).toHaveLength(0)

  // Al cancelar, las demás vuelven a poder arrastrarse
  await user.click(within(aEliminar).getByRole('button', { name: 'Cancelar' }))
  fireEvent.pointerDown(asaDe(otra), { pointerId: 2, clientX: 500, clientY: 100, button: 0 })
  fireEvent.pointerMove(window, { pointerId: 2, clientX: 520, clientY: 110 })
  fireEvent.pointerUp(window, { pointerId: 2, clientX: 520, clientY: 110 })
  expect(otra).toHaveStyle({ left: '420px', top: '60px' })
})
