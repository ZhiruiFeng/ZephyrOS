import ModuleFullScreenView from './ModuleFullScreenView'

interface ProfileModulePageProps {
  params: {
    moduleId: string
  }
}

export default function ProfileModulePage({ params }: ProfileModulePageProps) {
  return <ModuleFullScreenView moduleId={params.moduleId} />
}
