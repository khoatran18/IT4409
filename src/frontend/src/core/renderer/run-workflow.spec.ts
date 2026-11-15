import type { Workflow } from '@codeflow/schema'
import { inventorySample } from '@codeflow/schema'
import { describe, expect, it } from 'vitest'
import { evaluateCondition, runWorkflow, type WorkflowEffects } from './run-workflow'
import { simulateApi } from './sample-api'

function effects(overrides: Partial<WorkflowEffects> = {}): WorkflowEffects & { log: string[] } {
  const log: string[] = []
  return {
    log,
    values: {},
    callApi: async (call) => {
      log.push(`api:${call.op}:${call.entity}:${call.id ?? ''}`)
      return { ok: true, id: 'r1', status: 'active' }
    },
    navigate: (to) => log.push(`nav:${to}`),
    message: (kind, text) => log.push(`msg:${kind}:${text}`),
    ...overrides,
  }
}

const flow: Workflow = {
  id: 'wf1',
  nodes: [
    { id: 'n1', type: 'callApi', config: { entity: 'Product', op: 'create' } },
    { id: 'n2', type: 'condition', config: { source: 'result', field: 'ok', operator: 'eq', value: 'true' } },
    { id: 'n3', type: 'showMessage', config: { kind: 'success', text: 'Xong' } },
    { id: 'n4', type: 'navigate', config: { to: '/products' } },
    { id: 'n5', type: 'showMessage', config: { kind: 'error', text: 'Hỏng' } },
  ],
  edges: [
    { from: 'n1', to: 'n2' },
    { from: 'n2', to: 'n3', branch: 'true' },
    { from: 'n3', to: 'n4' },
    { from: 'n2', to: 'n5', branch: 'false' },
  ],
}

describe('evaluateCondition', () => {
  const values = { name: 'An', age: '20', empty: '' }
  it.each([
    [{ field: 'name', operator: 'eq', value: 'An' }, true],
    [{ field: 'name', operator: 'eq', value: 'Bình' }, false],
    [{ field: 'name', operator: 'neq', value: 'Bình' }, true],
    [{ field: 'age', operator: 'gt', value: '18' }, true],
    [{ field: 'age', operator: 'lt', value: '18' }, false],
    [{ field: 'missing', operator: 'gt', value: '1' }, false],
    [{ field: 'name', operator: 'contains', value: 'n' }, true],
    [{ field: 'empty', operator: 'empty' }, true],
    [{ field: 'name', operator: 'empty' }, false],
    [{ field: 'name', value: 'An' }, true],
  ])('%j -> %s', (config, expected) => {
    expect(evaluateCondition(config, values, undefined)).toBe(expected)
  })

  it('source = result đọc kết quả callApi trước đó', () => {
    expect(evaluateCondition({ source: 'result', field: 'status', operator: 'eq', value: 'active' }, {}, { status: 'active' })).toBe(true)
    expect(evaluateCondition({ source: 'result', field: 'status', operator: 'eq', value: 'x' }, {}, undefined)).toBe(false)
  })
})

describe('runWorkflow', () => {
  it('chạy tuần tự và đi nhánh true của condition', async () => {
    const fx = effects()
    const run = await runWorkflow(flow, fx)
    expect(run.ok).toBe(true)
    expect(fx.log).toEqual(['api:create:Product:', 'msg:success:Xong', 'nav:/products'])
    expect(run.steps.map((s) => s.nodeId)).toEqual(['n1', 'n2', 'n3', 'n4'])
    expect(run.steps[1].branch).toBe('true')
  })

  it('đi nhánh false khi điều kiện sai', async () => {
    const fx = effects({ callApi: async () => ({ ok: false }) })
    await runWorkflow(flow, fx)
    expect(fx.log).toEqual(['msg:error:Hỏng'])
  })

  it('condition thiếu nhánh được chọn thì dừng ở đó', async () => {
    const half: Workflow = { ...flow, edges: flow.edges.filter((e) => e.branch !== 'false') }
    const fx = effects({ callApi: async () => ({ ok: false }) })
    const run = await runWorkflow(half, fx)
    expect(run.ok).toBe(true)
    expect(fx.log).toEqual([])
  })

  it('callApi dùng id từ values hoặc param', async () => {
    const wf: Workflow = { id: 'w', nodes: [{ id: 'n1', type: 'callApi', config: { entity: 'Product', op: 'get', idSource: 'param' } }], edges: [] }
    const a = effects({ values: { id: 'v1' }, params: { id: 'p1' } })
    await runWorkflow(wf, a)
    expect(a.log).toEqual(['api:get:Product:p1'])
    const b = effects({ values: { id: 'v1' }, params: { id: 'p1' } })
    await runWorkflow({ ...wf, nodes: [{ ...wf.nodes[0], config: { ...wf.nodes[0].config, idSource: 'values' } }] }, b)
    expect(b.log).toEqual(['api:get:Product:v1'])
  })

  it('lỗi của callApi dừng workflow và được báo, không ném ngoại lệ', async () => {
    const fx = effects({ callApi: async () => Promise.reject(new Error('Mất mạng')) })
    const run = await runWorkflow(flow, fx)
    expect(run).toEqual({ ok: false, steps: [{ nodeId: 'n1', error: 'Mất mạng' }], error: 'Mất mạng' })
    expect(fx.log).toEqual([])
  })

  it('workflow có vòng lặp bị chặn sau số bước tối đa', async () => {
    const wf: Workflow = {
      id: 'w',
      nodes: ['s', 'a', 'b'].map((id) => ({ id, type: 'showMessage' as const, config: { text: id } })),
      edges: [{ from: 's', to: 'a' }, { from: 'a', to: 'b' }, { from: 'b', to: 'a' }],
    }
    const run = await runWorkflow(wf, effects())
    expect(run.ok).toBe(false)
    expect(run.steps).toHaveLength(100)
  })

  it('workflow rỗng chạy xong không làm gì', async () => {
    expect(await runWorkflow({ id: 'w', nodes: [], edges: [] }, effects())).toEqual({ ok: true, steps: [] })
  })
})

describe('simulateApi', () => {
  const call = (op: string, id?: string, values: Record<string, unknown> = {}) => simulateApi(inventorySample, { entity: 'Product', op, id, values })

  it('list, get, create, update, delete trên dữ liệu mẫu', async () => {
    expect(await call('list')).toMatchObject({ data: expect.any(Array), meta: { total: 23 } })
    expect(await call('get', 'sample-2')).toMatchObject({ id: 'sample-2', name: 'name 2' })
    expect(await call('create', undefined, { name: 'Mới' })).toEqual({ name: 'Mới', id: 'sample-new' })
    expect(await call('update', 'sample-1', { name: 'Đổi' })).toMatchObject({ id: 'sample-1', name: 'Đổi' })
    expect(await call('delete', 'sample-1')).toBeUndefined()
  })

  it('báo lỗi khi thiếu id, id lạ hoặc entity lạ', async () => {
    await expect(call('get')).rejects.toThrow(/Thiếu id/)
    await expect(call('get', 'zzz')).rejects.toThrow(/Không tìm thấy/)
    await expect(simulateApi(inventorySample, { entity: 'Ghost', op: 'list', values: {} })).rejects.toThrow(/Ghost/)
  })
})
