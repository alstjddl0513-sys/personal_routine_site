import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import {
  blogPosts,
  blogSources,
  companies,
  companyEvents,
  companyTypes,
  dayNotes,
  documents,
  exercises,
  muscleGoals,
  profiles,
  questionCategories,
  questionLogEvents,
  questionLogs,
  questions,
  routineChallengeBlocks,
  routineChallenges,
  routineChecks,
  schedulerMemos,
  timeBlocks,
  workoutSessions,
  workoutSets,
  workoutSplitExercises,
  workoutSplits,
} from '../db/schema';

// 내 데이터 전부 백업(JSON 한 파일). 몇천 행이라 페이지 나누기 없이 한 번에.
// 넣지 않는 것: 공지·공지 읽음(운영용), 피드백(앱에 보낸 의견), 이력서·포트폴리오
// 파일 자체(Storage — 백업엔 documents 행 정보만). 모양이 바뀌면 schemaVersion +1.
@Injectable()
export class ExportService {
  async dumpAll(ownerId: string) {
    const [
      profileRows,
      companiesRows,
      companyTypesRows,
      companyEventsRows,
      schedulerMemosRows,
      documentsRows,
      timeBlocksRows,
      routineChecksRows,
      dayNotesRows,
      routineChallengesRows,
      routineChallengeBlocksRows,
      exercisesRows,
      workoutSessionsRows,
      workoutSetsRows,
      workoutSplitsRows,
      workoutSplitExercisesRows,
      muscleGoalsRows,
      questionCategoriesRows,
      questionsRows,
      questionLogsRows,
      questionLogEventsRows,
      blogSourcesRows,
      blogPostsRows,
    ] = await Promise.all([
      // 프로필은 닉네임 · 설정값만(내부용 defaultsVersion X)
      db
        .select({
          nickname: profiles.nickname,
          preferences: profiles.preferences,
          createdAt: profiles.createdAt,
        })
        .from(profiles)
        .where(eq(profiles.id, ownerId)),
      db.select().from(companies).where(eq(companies.ownerId, ownerId)),
      db.select().from(companyTypes).where(eq(companyTypes.ownerId, ownerId)),
      db.select().from(companyEvents).where(eq(companyEvents.ownerId, ownerId)),
      db
        .select()
        .from(schedulerMemos)
        .where(eq(schedulerMemos.ownerId, ownerId)),
      db.select().from(documents).where(eq(documents.ownerId, ownerId)),
      db.select().from(timeBlocks).where(eq(timeBlocks.ownerId, ownerId)),
      db.select().from(routineChecks).where(eq(routineChecks.ownerId, ownerId)),
      db.select().from(dayNotes).where(eq(dayNotes.ownerId, ownerId)),
      db
        .select()
        .from(routineChallenges)
        .where(eq(routineChallenges.ownerId, ownerId)),
      // junction엔 owner가 없어서 내 챌린지로 조인
      db
        .select({
          challengeId: routineChallengeBlocks.challengeId,
          blockId: routineChallengeBlocks.blockId,
        })
        .from(routineChallengeBlocks)
        .innerJoin(
          routineChallenges,
          eq(routineChallenges.id, routineChallengeBlocks.challengeId),
        )
        .where(eq(routineChallenges.ownerId, ownerId)),
      db.select().from(exercises).where(eq(exercises.ownerId, ownerId)),
      db
        .select()
        .from(workoutSessions)
        .where(eq(workoutSessions.ownerId, ownerId)),
      db.select().from(workoutSets).where(eq(workoutSets.ownerId, ownerId)),
      db.select().from(workoutSplits).where(eq(workoutSplits.ownerId, ownerId)),
      // junction엔 owner가 없어서 내 분할로 조인
      db
        .select({
          splitId: workoutSplitExercises.splitId,
          exerciseId: workoutSplitExercises.exerciseId,
        })
        .from(workoutSplitExercises)
        .innerJoin(
          workoutSplits,
          eq(workoutSplits.id, workoutSplitExercises.splitId),
        )
        .where(eq(workoutSplits.ownerId, ownerId)),
      db.select().from(muscleGoals).where(eq(muscleGoals.ownerId, ownerId)),
      db
        .select()
        .from(questionCategories)
        .where(eq(questionCategories.ownerId, ownerId)),
      db.select().from(questions).where(eq(questions.ownerId, ownerId)),
      db.select().from(questionLogs).where(eq(questionLogs.ownerId, ownerId)),
      db
        .select()
        .from(questionLogEvents)
        .where(eq(questionLogEvents.ownerId, ownerId)),
      db.select().from(blogSources).where(eq(blogSources.ownerId, ownerId)),
      db.select().from(blogPosts).where(eq(blogPosts.ownerId, ownerId)),
    ]);

    return {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      data: {
        profile: profileRows[0] ?? null,
        companies: companiesRows,
        companyTypes: companyTypesRows,
        companyEvents: companyEventsRows,
        schedulerMemos: schedulerMemosRows,
        documents: documentsRows,
        timeBlocks: timeBlocksRows,
        routineChecks: routineChecksRows,
        dayNotes: dayNotesRows,
        routineChallenges: routineChallengesRows,
        routineChallengeBlocks: routineChallengeBlocksRows,
        exercises: exercisesRows,
        workoutSessions: workoutSessionsRows,
        workoutSets: workoutSetsRows,
        workoutSplits: workoutSplitsRows,
        workoutSplitExercises: workoutSplitExercisesRows,
        muscleGoals: muscleGoalsRows,
        questionCategories: questionCategoriesRows,
        questions: questionsRows,
        questionLogs: questionLogsRows,
        questionLogEvents: questionLogEventsRows,
        blogSources: blogSourcesRows,
        blogPosts: blogPostsRows,
      },
    };
  }
}
