import { render, screen } from '@testing-library/react'
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
