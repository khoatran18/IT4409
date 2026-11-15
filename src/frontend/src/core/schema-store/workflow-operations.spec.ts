import { createEmptyProject, inventorySample, type ComponentNode, type ProjectSchema, type Workflow } from '@codeflow/schema'
import { describe, expect, it } from 'vitest'
import {
  addNode,
  addWorkflow,
  connect,
  disconnect,
  executionOrder,
  removeNode,
  removeWorkflow,
  routeChoices,
  setEvent,
  startNodes,
  updateNodeConfig,
  validateWorkflow,
} from './workflow-operations'

function projectWithButton(): ProjectSchema {
  const button: ComponentNode = { id: 'c1', type: 'Button', props: {}, events: { onClick: 'wf1' } }
  return {
    ...createEmptyProject('t'),
    entities: structuredClone(inventorySample.entities),
    pages: [{ id: 'p1', route: '/', title: 'Home', requireRole: [], components: [{ id: 'c0', type: 'Container', props: {}, children: [button] }] }],
  }
}

/** wf1: n1(callApi) -> n2(condition) -true-> n3(navigate), -false-> n4(showMessage) */
function branching(): Workflow {
  return {
    id: 'wf1',
    nodes: [
      { id: 'n1', type: 'callApi', config: { entity: 'Product', op: 'create' } },
      { id: 'n2', type: 'condition', config: { field: 'name', operator: 'eq', value: 'a' } },
      { id: 'n3', type: 'navigate', config: { to: '/products' } },
      { id: 'n4', type: 'showMessage', config: { kind: 'error', text: 'Lỗi' } },
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3', branch: 'true' },
      { from: 'n2', to: 'n4', branch: 'false' },
    ],
  }
}

describe('workflow', () => {
  it('addWorkflow cấp id wf1, wf2... không trùng', () => {
    const first = addWorkflow(createEmptyProject('t'))
    expect(first.id).toBe('wf1')
    const second = addWorkflow(first.project)
    expect(second.id).toBe('wf2')
    expect(addWorkflow(removeWorkflow(second.project, 'wf1')).id).toBe('wf3')
  })

  it('removeWorkflow gỡ workflow khỏi sự kiện của component, kể cả component lồng', () => {
    const base = projectWithButton()
    const project = removeWorkflow({ ...base, workflows: [{ id: 'wf1', nodes: [], edges: [] }] }, 'wf1')
    expect(project.workflows).toEqual([])
    const button = project.pages[0].components[0].children![0]
    expect(button.events).toBeUndefined()
  })

  it('setEvent gắn và gỡ workflow, giữ các event khác', () => {
    const base = projectWithButton()
    const attached = setEvent(base, 'c1', 'onChange', 'wf2')
    expect(attached.pages[0].components[0].children![0].events).toEqual({ onClick: 'wf1', onChange: 'wf2' })
    const removed = setEvent(attached, 'c1', 'onClick', undefined)
    expect(removed.pages[0].components[0].children![0].events).toEqual({ onChange: 'wf2' })
  })
})

describe('node', () => {
  it('addNode điền config mặc định và cấp id n1, n2...', () => {
    const { project } = addWorkflow(createEmptyProject('t'))
    const a = addNode(project, 'wf1', 'callApi')
    expect(a.id).toBe('n1')
    expect(a.project.workflows[0].nodes[0]).toEqual({ id: 'n1', type: 'callApi', config: { op: 'create', idSource: 'values' } })
    expect(addNode(a.project, 'wf1', 'showMessage').id).toBe('n2')
  })

  it('addNode từ chối workflow hoặc loại node không có', () => {
    const { project } = addWorkflow(createEmptyProject('t'))
    expect(addNode(project, 'nope', 'navigate').error).toBeDefined()
    expect(addNode(project, 'wf1', 'loop').error).toBeDefined()
  })

  it('removeNode xóa luôn cạnh liên quan', () => {
    const project = { ...createEmptyProject('t'), workflows: [branching()] }
    const next = removeNode(project, 'wf1', 'n2')
    expect(next.workflows[0].nodes.map((n) => n.id)).toEqual(['n1', 'n3', 'n4'])
    expect(next.workflows[0].edges).toEqual([])
  })

  it('updateNodeConfig gộp giá trị và xóa khóa khi rỗng', () => {
    const project = { ...createEmptyProject('t'), workflows: [branching()] }
    const next = updateNodeConfig(project, 'wf1', 'n3', { to: '/orders', extra: 1 })
    expect(next.workflows[0].nodes[2].config).toEqual({ to: '/orders', extra: 1 })
    expect(updateNodeConfig(next, 'wf1', 'n3', { extra: undefined, to: '' }).workflows[0].nodes[2].config).toEqual({})
  })
})

describe('connect / disconnect', () => {
  const base = () => ({ ...createEmptyProject('t'), workflows: [{ ...branching(), edges: [] }] })

  it('nối node thường, condition phải chỉ nhánh', () => {
    const a = connect(base(), 'wf1', 'n1', 'n2')
    expect(a.error).toBeUndefined()
    expect(a.project.workflows[0].edges).toEqual([{ from: 'n1', to: 'n2' }])
    expect(connect(a.project, 'wf1', 'n2', 'n3').error).toMatch(/nhánh/)
    expect(connect(a.project, 'wf1', 'n1', 'n3', 'true').error).toMatch(/Condition/)
    expect(connect(a.project, 'wf1', 'n2', 'n3', 'true').project.workflows[0].edges).toContainEqual({ from: 'n2', to: 'n3', branch: 'true' })
  })

  it('nối lại từ cùng đầu ra thì thay cạnh cũ', () => {
    const a = connect(base(), 'wf1', 'n1', 'n2').project
    const b = connect(a, 'wf1', 'n1', 'n3').project
    expect(b.workflows[0].edges).toEqual([{ from: 'n1', to: 'n3' }])
  })

  it('từ chối tự nối, node không tồn tại, nhiều cạnh vào và vòng lặp', () => {
    const a = connect(base(), 'wf1', 'n1', 'n2').project
    expect(connect(a, 'wf1', 'n1', 'n1').error).toBeDefined()
    expect(connect(a, 'wf1', 'n1', 'zz').error).toBeDefined()
    expect(connect(a, 'wf1', 'n3', 'n2').error).toMatch(/cạnh vào/)
    const b = connect(a, 'wf1', 'n2', 'n3', 'true').project
    expect(connect(b, 'wf1', 'n3', 'n1').error).toMatch(/vòng/)
  })

  it('disconnect chỉ gỡ đúng cạnh', () => {
    const project = { ...createEmptyProject('t'), workflows: [branching()] }
    const next = disconnect(project, 'wf1', 'n2', 'n3', 'true')
    expect(next.workflows[0].edges).toHaveLength(2)
    expect(next.workflows[0].edges).not.toContainEqual({ from: 'n2', to: 'n3', branch: 'true' })
  })
})

describe('thứ tự thực thi', () => {
  it('đi từ node bắt đầu, nhánh true trước false', () => {
    expect(startNodes(branching()).map((n) => n.id)).toEqual(['n1'])
    expect(executionOrder(branching())).toEqual(['n1', 'n2', 'n3', 'n4'])
  })

  it('bỏ qua node không với tới và chịu được workflow rỗng hoặc có vòng', () => {
    const wf = branching()
    wf.edges = [{ from: 'n1', to: 'n2' }]
    expect(executionOrder(wf)).toEqual(['n1', 'n2'])
    expect(executionOrder({ id: 'x', nodes: [], edges: [] })).toEqual([])
    const cyclic: Workflow = { id: 'c', nodes: [wf.nodes[0], wf.nodes[2]], edges: [{ from: 'n1', to: 'n3' }, { from: 'n3', to: 'n1' }] }
    expect(executionOrder(cyclic)).toEqual([])
  })
})

describe('validateWorkflow', () => {
  const messages = (wf: Workflow, project?: ProjectSchema) => validateWorkflow(wf, project).map((i) => i.message)

  it('workflow hợp lệ không có lỗi', () => {
    expect(validateWorkflow(branching(), projectWithButton())).toEqual([])
  })

  it('workflow rỗng', () => {
    expect(messages({ id: 'x', nodes: [], edges: [] })).toEqual(['Workflow chưa có node nào'])
  })

  it('đúng một node bắt đầu', () => {
    const wf = branching()
    wf.edges = [{ from: 'n1', to: 'n2' }]
    expect(messages(wf).join('\n')).toMatch(/3 node bắt đầu/)
    const loop: Workflow = { id: 'l', nodes: [wf.nodes[2], wf.nodes[3]], edges: [{ from: 'n3', to: 'n4' }, { from: 'n4', to: 'n3' }] }
    expect(messages(loop).join('\n')).toMatch(/Không có node bắt đầu/)
    expect(messages(loop).join('\n')).toMatch(/vòng lặp/)
  })

  it('condition cần ít nhất một nhánh và cạnh ra phải có nhánh', () => {
    const wf = branching()
    wf.edges = [{ from: 'n1', to: 'n2' }]
    expect(messages({ ...wf, nodes: wf.nodes.slice(0, 2) })).toContain('n2: Condition cần ít nhất một nhánh')
    wf.edges = [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }]
    expect(messages({ ...wf, nodes: wf.nodes.slice(0, 3) })).toContain('n2: cạnh ra của Condition thiếu nhánh')
  })

  it('node thường chỉ một cạnh ra, một cạnh vào', () => {
    const wf = branching()
    wf.edges = [{ from: 'n1', to: 'n2' }, { from: 'n1', to: 'n3' }, { from: 'n2', to: 'n3', branch: 'true' }]
    const list = messages({ ...wf, nodes: wf.nodes.slice(0, 3) })
    expect(list).toContain('n1: chỉ được một cạnh ra')
    expect(list).toContain('n3: có nhiều hơn một cạnh vào')
  })

  it('config bắt buộc và entity không tồn tại', () => {
    const wf: Workflow = {
      id: 'x',
      nodes: [
        { id: 'n1', type: 'callApi', config: {} },
        { id: 'n2', type: 'navigate', config: {} },
        { id: 'n3', type: 'showMessage', config: {} },
        { id: 'n4', type: 'condition', config: {} },
      ],
      edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }, { from: 'n3', to: 'n4' }],
    }
    const issues = validateWorkflow(wf, projectWithButton())
    const props = issues.filter((i) => i.prop).map((i) => `${i.nodeId}.${i.prop}`)
    expect(props).toEqual(expect.arrayContaining(['n1.entity', 'n2.to', 'n3.text', 'n4.field', 'n4.value']))
    wf.nodes[0].config = { entity: 'Ghost', op: 'create' }
    expect(messages(wf, projectWithButton())).toContain('n1: entity "Ghost" không tồn tại')
  })

  it('condition rỗng không đòi value, callApi create không đòi idSource', () => {
    const wf: Workflow = {
      id: 'x',
      nodes: [
        { id: 'n1', type: 'callApi', config: { entity: 'Product', op: 'create' } },
        { id: 'n2', type: 'condition', config: { field: 'name', operator: 'empty' } },
      ],
      edges: [{ from: 'n1', to: 'n2' }],
    }
    expect(messages(wf)).toEqual(['n2: Condition cần ít nhất một nhánh'])
  })
})

describe('routeChoices', () => {
  it('gồm route trang tùy biến và trang entity, không trùng', () => {
    const project = { ...projectWithButton(), entities: [{ name: 'Category', ownerOnly: false, fields: [] }] }
    expect(routeChoices(project)).toEqual(['/', '/categories', '/categories/new'])
  })
})
