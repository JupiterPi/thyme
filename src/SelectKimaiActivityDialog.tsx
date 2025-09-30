import { useState } from "react"
import ipc from "./ipc"
import { useObservable } from "./util"
import classNames from "classnames"
import { actions } from "../electron/schema"

export function SelectKimaiActivityDialog() {
    const isAvailable = useObservable(ipc.state)?.activeStartTime === null

    const kimaiProjectsAndActivities = useObservable(ipc.kimaiProjectsAndActivities)

    const [selectedProject, setSelectedProject] = useState<NonNullable<typeof kimaiProjectsAndActivities>[number] | null>(null)
    const availableActivities = selectedProject?.activities ?? []

    const selectActivity = (activity: NonNullable<typeof kimaiProjectsAndActivities>[number]["activities"][number]) => {
        if (selectedProject === null) return
        ipc.dispatch(actions.setActivity({
            name: `${selectedProject.project.name} > ${activity.name}`,
            kimai: {
                projectId: selectedProject.project.id,
                activityId: activity.id,
            }
        }))
        ipc.closePage("selectKimaiActivityDialog")
    }

    return <div className="flex flex-col items-start w-full">
        <h2 className="text-xl font-semibold mb-3">Select Kimai Activity</h2>
        
        <div className="flex w-full justify-stretch gap-3">
            <div className="flex-1 flex flex-col gap-2">
                {/* projects */}
                Project:
                {kimaiProjectsAndActivities?.map(project => (
                    <button key={project.project.id} disabled={!isAvailable} className={classNames("_button", { "outline-1! focus:outline-solid!": selectedProject === project })} onClick={() => setSelectedProject(project)}>
                        {project.project.name}
                    </button>
                ))}
            </div>
            <div className="flex-1 flex flex-col gap-2">
                {/* activities */}
                Activity:
                {availableActivities.length === 0 && <div className="text-sm text-green-700 italic">Select a project</div>}
                {availableActivities.map(activity => (
                    <button key={activity.id} disabled={!isAvailable} className="_button" onClick={() => selectActivity(activity)}>
                        {activity.name}
                    </button>
                ))}
            </div>
        </div>
    </div>
}