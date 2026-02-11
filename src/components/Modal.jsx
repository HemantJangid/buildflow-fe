/**
 * Modal – Generic reusable modal. Content is always passed from the parent as children.
 * Use for forms, confirmations, or any other overlay content.
 *
 * @param {boolean} open – Whether the modal is visible
 * @param {function} onClose – Called when closing (backdrop click or Escape)
 * @param {string} [title] – Optional title
 * @param {React.ReactNode} children – Modal body (passed from parent)
 * @param {React.ReactNode} [footer] – Optional footer (e.g. buttons)
 * @param {string} [size] – 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 * @param {string} [className] – Extra class for the modal card
 */
export { default } from "@/components/ui/modal";
