import { FiMapPin, FiPhone, FiStar } from "react-icons/fi";
import { useEmployerT } from "@/i18n/employerText";
import type { Application } from "@/types";
import WorkerAvatar from "./WorkerAvatar";
import { displayPhone, nameOf, phoneOf, skillsOf, waLink, workerRating, type Stage } from "./helpers";

interface ApplicantProfileProps {
  application: Application;
  stage: Stage;
}

const chip = "rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-[13.5px] px-3 py-1.5";

export default function ApplicantProfile({ application: a, stage }: ApplicantProfileProps) {
  const { tr } = useEmployerT();
  const worker = a.worker;
  const phone = phoneOf(a);
  const rating = workerRating(a);
  const skills = skillsOf(a);
  const documents = worker?.documents ?? [];
  const areas = worker?.serviceAreas ?? [];
  const contactHidden = stage === "new" || stage === "review" || stage === "declined";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <WorkerAvatar name={nameOf(a)} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="m-0 text-[22px] font-extrabold leading-tight text-slate-900">{nameOf(a)}</h3>
            {worker?.backgroundVerified && (
              <span className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-[12.5px] font-medium px-2 py-0.5">{tr("verified")}</span>
            )}
          </div>
          <p className="m-0 mt-1 text-[14px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <FiStar className="text-amber-400" />
              {rating ? rating.toFixed(1) : tr("isNew")}
              {worker?.totalReviews ? ` ${tr("shiftsN", { n: worker.totalReviews })}` : ""}
            </span>
            {worker?.location && (
              <span className="inline-flex items-center gap-1">
                <FiMapPin /> {worker.location}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[12.5px] text-slate-500">{tr("workerContact")}</div>
          <div className="text-[18px] font-bold text-slate-900">{phone ? displayPhone(phone) : contactHidden ? tr("contactAfterAccept") : tr("notProvided")}</div>
        </div>
        {phone && (
          <div className="flex gap-2">
            <a
              href={`tel:${phone}`}
              className="h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[14px] font-medium text-slate-800 no-underline flex items-center gap-2"
            >
              <FiPhone /> {tr("callNow")}
            </a>
            <a
              href={waLink(phone)}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[14px] font-medium no-underline flex items-center"
            >
              {tr("whatsapp")}
            </a>
          </div>
        )}
      </div>

      {worker?.about && (
        <section>
          <h4 className="m-0 mb-1.5 text-[12.5px] font-bold tracking-wider text-slate-500 uppercase">{tr("dt_about")}</h4>
          <p className="m-0 text-[14px] leading-relaxed text-slate-700">{worker.about}</p>
        </section>
      )}

      <section>
        <h4 className="m-0 mb-2 text-[12.5px] font-bold tracking-wider text-slate-500 uppercase">{tr("dt_skills")}</h4>
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className={chip}>
                {s}
              </span>
            ))}
          </div>
        ) : (
          <p className="m-0 text-[14px] text-slate-500">{tr("ws_noSkills")}</p>
        )}
      </section>

      <section>
        <h4 className="m-0 mb-2 text-[12.5px] font-bold tracking-wider text-slate-500 uppercase">{tr("dt_experience")}</h4>
        {worker?.experienceYears || worker?.totalReviews ? (
          <ul className="m-0 p-0 list-none flex flex-col gap-1 text-[14px] text-slate-700">
            {worker?.experienceYears ? <li>{tr("dt_expYears", { n: worker.experienceYears })}</li> : null}
            {worker?.totalReviews ? <li>{tr("dt_expRated", { n: worker.totalReviews })}</li> : null}
          </ul>
        ) : (
          <p className="m-0 text-[14px] text-slate-500">{tr("dt_expNone")}</p>
        )}
      </section>

      {documents.length > 0 && (
        <section>
          <h4 className="m-0 mb-2 text-[12.5px] font-bold tracking-wider text-slate-500 uppercase">{tr("dt_documents")}</h4>
          <div className="flex flex-wrap gap-2">
            {documents.map((d) => (
              <span key={d.title} className={chip}>
                {d.title}
                {d.verified ? " ✓" : ""}
              </span>
            ))}
          </div>
        </section>
      )}

      {areas.length > 0 && (
        <section>
          <h4 className="m-0 mb-2 text-[12.5px] font-bold tracking-wider text-slate-500 uppercase">{tr("dt_areas")}</h4>
          <div className="flex flex-wrap gap-2">
            {areas.map((area) => (
              <span key={area} className={chip}>
                {area}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
