import { beforeAll, describe, expect, it } from 'vitest'
import { defaultProps, list, missingRequired, register, resolveProps } from '.'

describe('registry', () => {
  it('đăng ký sẵn các component khớp COMPONENT_REGISTRY của validator', () => {
    expect(list().map((d) => d.type).sort()).toEqual(
      ['Button', 'Card', 'Checkbox', 'Container', 'Form', 'Heading', 'Input', 'Select', 'Table', 'Text'],
    )
  })

  it('chỉ Container và Card chứa được con', () => {
    expect(list().filter((d) => d.container).map((d) => d.type).sort()).toEqual(['Card', 'Container'])
  })

  it('mọi component có category, label và template', () => {
    for (const def of list()) {
      expect(def.category, def.type).toBeDefined()
      expect(def.template, def.type).toBe(`src/components/${def.type}.tsx.hbs`)
    }
  })

  it('Table và Form bắt buộc entity (và columns), không có default', () => {
    expect(missingRequired({ type: 'Table', props: {} })).toEqual(['entity', 'columns'])
    expect(missingRequired({ type: 'Form', props: {} })).toEqual(['entity'])
    expect(defaultProps('Table')).toEqual({ pageSize: 10, actions: ['edit', 'delete'] })
    expect(defaultProps('Form')).toEqual({ mode: 'create', submitText: 'Lưu' })
  })

  it('default khớp validator: Heading, Container', () => {
    expect(defaultProps('Heading')).toEqual({ text: 'Tiêu đề', level: 2 })
    expect(defaultProps('Container')).toEqual({ direction: 'column', gap: 16 })
  })

  it('resolveProps lấy giá trị đã đặt đè lên default', () => {
    expect(resolveProps({ type: 'Button', props: { text: 'Lưu' } })).toEqual({ text: 'Lưu', variant: 'primary', disabled: false })
  })

  it('không đăng ký trùng type', () => {
    expect(() => register({ type: 'Button', label: 'x', props: {}, events: [], template: '' })).toThrow()
  })

  it('defaultProps điền giá trị mặc định', () => {
    expect(defaultProps('Button')).toEqual({ text: 'Button', variant: 'primary', disabled: false })
    expect(defaultProps('Unknown')).toEqual({})
  })

  describe('missingRequired', () => {
    beforeAll(() => {
      register({
      type: 'TestTable',
      label: 'TestTable',
      props: {
        entity: { type: 'entityRef', required: true },
        columns: { type: 'fieldList', required: true },
        pageSize: { type: 'number', default: 10 },
      },
      events: [],
      template: '',
      })
    })

    it('báo prop bắt buộc còn thiếu hoặc rỗng', () => {
      expect(missingRequired({ type: 'TestTable', props: { columns: [] } })).toEqual(['entity', 'columns'])
    })

    it('đủ prop thì không báo', () => {
      expect(missingRequired({ type: 'TestTable', props: { entity: 'Student', columns: ['name'] } })).toEqual([])
    })

    it('component không có prop bắt buộc', () => {
      expect(missingRequired({ type: 'Button', props: {} })).toEqual([])
    })
  })
})
