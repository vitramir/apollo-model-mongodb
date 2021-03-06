import { AMOperation } from '../operation';
import { AMDBExecutor, AMDBExecutorOperationType } from '../../definitions';
import { completeAMResultPromise } from '../resultPromise/utils';

export class AMReadOperation extends AMOperation {
  async execute(executor: AMDBExecutor) {
    executor({
      type: this.many
        ? AMDBExecutorOperationType.FIND
        : AMDBExecutorOperationType.FIND_ONE,
      collection: this.collectionName,
      selector: await completeAMResultPromise(
        this.selector ? this.selector.selector : undefined
      ),
      fields: await completeAMResultPromise(
        this.fieldsSelection ? this.fieldsSelection.fields : undefined
      ),
      options: { sort: this.orderBy, limit: this.first, skip: this.skip },
    })
      .then(this._result.resolve)
      .catch(this._result.reject);
  }
}
