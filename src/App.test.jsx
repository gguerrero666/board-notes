import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App.jsx'

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

test('al escribir título y texto y confirmar, la nota aparece en el board sin recargar', async () => {
  const creada = { id: 7, title: 'Pagar luz', text: 'Vence el viernes' }
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'POST') {
      return { ok: true, json: async () => creada }
    }
    return { ok: true, json: async () => [] }
  })
  const user = userEvent.setup()

  render(<App />)
  await user.type(screen.getByLabelText('Título'), 'Pagar luz')
  await user.type(screen.getByLabelText('Texto'), 'Vence el viernes')
  await user.click(screen.getByRole('button', { name: 'Agregar' }))

  expect(await screen.findByText('Pagar luz')).toBeInTheDocument()
  expect(screen.getByText('Vence el viernes')).toBeInTheDocument()
  expect(screen.getByLabelText('Título')).toHaveValue('')
  expect(screen.getByLabelText('Texto')).toHaveValue('')
  expect(fetch).toHaveBeenCalledWith(
    '/api/notes',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: 'Pagar luz', text: 'Vence el viernes' }),
    }),
  )
})

test('con el título vacío, al confirmar no se llama al backend y no aparece nota', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [],
  })
  const user = userEvent.setup()

  render(<App />)
  await user.type(screen.getByLabelText('Texto'), 'Texto sin título')
  await user.click(screen.getByRole('button', { name: 'Agregar' }))

  expect(fetch).not.toHaveBeenCalledWith('/api/notes', expect.objectContaining({ method: 'POST' }))
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
})

test('dos clics seguidos en Agregar envían un solo POST y crean una sola nota', async () => {
  let resolverPost
  vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) => {
    if (options?.method === 'POST') {
      return new Promise((resolve) => {
        resolverPost = () =>
          resolve({ ok: true, json: async () => ({ id: 9, title: 'Una sola', text: '' }) })
      })
    }
    return Promise.resolve({ ok: true, json: async () => [] })
  })
  const user = userEvent.setup()

  render(<App />)
  await user.type(screen.getByLabelText('Título'), 'Una sola')
  const boton = screen.getByRole('button', { name: 'Agregar' })
  await user.click(boton)
  await user.click(boton)
  resolverPost()

  expect(await screen.findByText('Una sola')).toBeInTheDocument()
  const posts = fetch.mock.calls.filter(([, options]) => options?.method === 'POST')
  expect(posts).toHaveLength(1)
  expect(screen.getAllByRole('article')).toHaveLength(1)
})

test('mientras la nota se está enviando, el botón Agregar está deshabilitado', async () => {
  let resolverPost
  vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) => {
    if (options?.method === 'POST') {
      return new Promise((resolve) => {
        resolverPost = () =>
          resolve({ ok: true, json: async () => ({ id: 10, title: 'Enviando', text: '' }) })
      })
    }
    return Promise.resolve({ ok: true, json: async () => [] })
  })
  const user = userEvent.setup()

  render(<App />)
  await user.type(screen.getByLabelText('Título'), 'Enviando')
  const boton = screen.getByRole('button', { name: 'Agregar' })
  expect(boton).toBeEnabled()
  await user.click(boton)

  expect(boton).toBeDisabled()

  resolverPost()
  expect(await screen.findByText('Enviando')).toBeInTheDocument()
  expect(boton).toBeEnabled()
})

test('los campos del formulario limitan el título a 100 y el texto a 1000 caracteres', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => [],
  })
  const user = userEvent.setup()

  render(<App />)
  await user.type(screen.getByLabelText('Título'), 'a'.repeat(101))

  expect(screen.getByLabelText('Título')).toHaveAttribute('maxlength', '100')
  expect(screen.getByLabelText('Texto')).toHaveAttribute('maxlength', '1000')
  expect(screen.getByLabelText('Título').value).toHaveLength(100)
})

test('si la petición de carga falla por red, se muestra el mensaje y el formulario sigue visible', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

  render(<App />)

  expect(await screen.findByText('No se pudieron cargar las notas.')).toBeInTheDocument()
  expect(screen.getByLabelText('Título')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Agregar' })).toBeInTheDocument()
})

test('si el servidor responde con error al cargar, se muestra el mensaje y el formulario sigue visible', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({ status: 500, error: 'Internal Server Error' }),
  })

  render(<App />)

  expect(await screen.findByText('No se pudieron cargar las notas.')).toBeInTheDocument()
  expect(screen.getByLabelText('Título')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Agregar' })).toBeInTheDocument()
})

test('si el guardado falla por red, se muestra el mensaje, no aparece ninguna nota y el formulario conserva lo escrito', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) => {
    if (options?.method === 'POST') {
      return Promise.reject(new TypeError('Failed to fetch'))
    }
    return Promise.resolve({ ok: true, json: async () => [] })
  })
  const user = userEvent.setup()

  render(<App />)
  await user.type(screen.getByLabelText('Título'), 'No se guarda')
  await user.type(screen.getByLabelText('Texto'), 'Sin conexión')
  await user.click(screen.getByRole('button', { name: 'Agregar' }))

  expect(await screen.findByText('No se pudo guardar la nota.')).toBeInTheDocument()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Título')).toHaveValue('No se guarda')
  expect(screen.getByLabelText('Texto')).toHaveValue('Sin conexión')
  expect(screen.getByRole('button', { name: 'Agregar' })).toBeEnabled()
})

test('si el servidor responde con error al guardar, se muestra el mensaje, no aparece ninguna nota y el formulario conserva lo escrito', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'POST') {
      return {
        ok: false,
        status: 500,
        json: async () => ({ status: 500, error: 'Internal Server Error' }),
      }
    }
    return { ok: true, json: async () => [] }
  })
  const user = userEvent.setup()

  render(<App />)
  await user.type(screen.getByLabelText('Título'), 'Error del servidor')
  await user.type(screen.getByLabelText('Texto'), 'Debe quedarse')
  await user.click(screen.getByRole('button', { name: 'Agregar' }))

  expect(await screen.findByText('No se pudo guardar la nota.')).toBeInTheDocument()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Título')).toHaveValue('Error del servidor')
  expect(screen.getByLabelText('Texto')).toHaveValue('Debe quedarse')
})

test('después de un error al guardar, al confirmar otra vez y funcionar, el mensaje desaparece y la nota aparece', async () => {
  let intentos = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    if (options?.method === 'POST') {
      intentos += 1
      if (intentos === 1) return { ok: false, status: 500, json: async () => ({}) }
      return { ok: true, json: async () => ({ id: 11, title: 'Reintento', text: 'Ahora sí' }) }
    }
    return { ok: true, json: async () => [] }
  })
  const user = userEvent.setup()

  render(<App />)
  await user.type(screen.getByLabelText('Título'), 'Reintento')
  await user.type(screen.getByLabelText('Texto'), 'Ahora sí')
  await user.click(screen.getByRole('button', { name: 'Agregar' }))
  expect(await screen.findByText('No se pudo guardar la nota.')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Agregar' }))

  expect(await screen.findByRole('article')).toHaveTextContent('Reintento')
  expect(screen.queryByText('No se pudo guardar la nota.')).not.toBeInTheDocument()
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
  await user.type(screen.getByLabelText('Título'), 'Nueva')
  await user.click(screen.getByRole('button', { name: 'Agregar' }))

  expect(await screen.findByRole('article')).toHaveTextContent('Nueva')
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

  fireEvent.pointerDown(nota, { clientX: 300, clientY: 200, button: 0 })
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

  fireEvent.pointerDown(nota, { clientX: 300, clientY: 200, button: 0 })
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

  fireEvent.pointerDown(nota, { clientX: 300, clientY: 200, button: 0 })
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

  fireEvent.pointerDown(nota, { clientX: 300, clientY: 200, button: 0 })
  fireEvent.pointerMove(window, { clientX: 350, clientY: 230 })
  fireEvent.pointerUp(window, { clientX: 350, clientY: 230 })
  expect(await screen.findByText('No se pudo guardar la posición.')).toBeInTheDocument()

  fireEvent.pointerDown(nota, { clientX: 350, clientY: 230, button: 0 })
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

  fireEvent.pointerDown(nota, { clientX: 300, clientY: 200, button: 0 })
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

  fireEvent.pointerDown(nota, { clientX: 300, clientY: 200, button: 0 })
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
    fireEvent.pointerDown(nota, { clientX: 300, clientY: 200, button })
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

  fireEvent.pointerDown(nota, { clientX: 300, clientY: 200, button: 0 })
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

  fireEvent.pointerDown(nota, { clientX: 0, clientY: 0, button: 0 })
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
