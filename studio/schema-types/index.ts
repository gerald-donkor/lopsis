import type {SchemaTypeDefinition} from 'sanity'

import {portableText} from './blocks/portable-text'
import {category} from './documents/category'
import {course} from './documents/course'
import {instructor} from './documents/instructor'
import {lesson} from './documents/lesson'
import {agentContext} from './documents/agent-context'
import {video} from './documents/video'
import {contentImage} from './objects/content-image'
import {learningOutcome} from './objects/learning-outcome'
import {courseModule, moduleObject} from './objects/module'
import {lessonResource, resourceObject} from './objects/resource'

export const schemaTypes: SchemaTypeDefinition[] = [
  course,
  lesson,
  instructor,
  category,
  video,
  agentContext,
  courseModule,
  moduleObject,
  learningOutcome,
  lessonResource,
  resourceObject,
  contentImage,
  portableText,
]
