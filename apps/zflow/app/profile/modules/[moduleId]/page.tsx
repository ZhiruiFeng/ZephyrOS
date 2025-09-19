import ModuleFullScreenView from './ModuleFullScreenView'

type ModulePageParams = Promise<{
  moduleId: string
}>

export default async function ProfileModulePage({ params }: { params: ModulePageParams }) {
  const { moduleId } = await params

  return <ModuleFullScreenView moduleId={moduleId} />
}
