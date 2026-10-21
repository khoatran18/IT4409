// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { useSchemaStore } from '../../core/schema-store'
import { EditorPage } from './EditorPage'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

async function renderEditor(): Promise<HTMLElement> {
  const container = document.createElement('div')
  await act(async () => createRoot(container).render(<EditorPage />))
  return container
}

describe('EditorPage (render trong jsdom, chưa kiểm thử kéo thả)', () => {
  it('palette liệt kê 3 component từ registry', async () => {
    const root = await renderEditor()
    const items = [...root.querySelectorAll('.palette-item')].map((el) => el.textContent)
    expect(items.sort()).toEqual(['Button', 'Container', 'Text'])
  })

  it('canvas vẽ component lồng trong Container và chọn thì highlight', async () => {
    const { add } = useSchemaStore.getState()
    act(() => {
      add('p1', null, 'Container')
      add('p1', 'c1', 'Button')
    })
    const root = await renderEditor()
    expect(root.querySelector('.pv-container .pv-button')?.textContent).toBe('Button')
    expect(root.querySelector('.node.selected')).not.toBeNull()

    await act(async () => root.querySelector<HTMLElement>('.canvas')!.click())
    expect(root.querySelector('.node.selected')).toBeNull()
  })
})
