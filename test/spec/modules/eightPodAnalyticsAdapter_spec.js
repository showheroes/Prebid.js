import analyticsAdapter, { storage, queue, trackEvent } from 'modules/eightPodAnalyticsAdapter.js';
import { expect } from 'chai';
import adapterManager from 'src/adapterManager.js';
import { EVENTS } from '../../../src/constants.js';
const eightPodAnalytics = analyticsAdapter;

const {
  BID_WON
} = EVENTS;

describe('eightPodAnalyticAdapter', function() {
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    adapterManager.enableAnalytics({
      provider: 'eightPod'
    });
  });

  afterEach(function() {
    sandbox.restore();
    analyticsAdapter.disableAnalytics();
  });

  describe('setup page', function() {
    let getDataFromLocalStorageStub, localStorageIsEnabledStub;
    let addEventListenerSpy;

    beforeEach(function() {
      localStorageIsEnabledStub = sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      getDataFromLocalStorageStub = sandbox.stub(
        storage,
        'getDataFromLocalStorage'
      );
      addEventListenerSpy = sandbox.spy(window, 'addEventListener');
    });

    afterEach(function() {
      getDataFromLocalStorageStub.restore();
      localStorageIsEnabledStub.restore();
      addEventListenerSpy.restore();
    });

    it('should subscribe on messageEvents', function() {
      getDataFromLocalStorageStub.returns(JSON.stringify([]));
      sandbox.spy(eightPodAnalytics, 'eventSubscribe');
      sandbox.spy(eightPodAnalytics, 'getEventFromLocalStorage');

      analyticsAdapter.setupPage();

      sandbox.assert.callCount(analyticsAdapter.eventSubscribe, 0);
      sandbox.assert.callCount(analyticsAdapter.getEventFromLocalStorage, 1);
    });

    it('should receive saved events list', function() {
      const eventList = [1, 2, 3];
      getDataFromLocalStorageStub.returns(JSON.stringify(eventList));
      sandbox.spy(eightPodAnalytics, 'eventSubscribe');

      analyticsAdapter.setupPage();
      expect(queue).to.deep.equal(eventList)
    });
  });

  describe('track event', function() {
    let setupPageStub;

    beforeEach(function() {
      setupPageStub = sandbox.stub(eightPodAnalytics, 'setupPage');
      eightPodAnalytics.resetContext();
    });

    afterEach(function() {
      setupPageStub.restore();
    });

    it('should NOT call setup page and get context', function() {
      eightPodAnalytics.track({
        eventType: 'wrong_event_type',
      })

      sandbox.assert.callCount(setupPageStub, 0);
      expect(analyticsAdapter.getContext()).to.deep.equal({})
    });

    it('should call setup page and get context', function() {
      eightPodAnalytics.track({
        eventType: BID_WON,
        args: {
          adUnitCode: 'adUnitCode',
          bidder: 'eightPod',
          creativeId: 'creativeId',
          seatBidId: 'seatBidId',
          cid: 'campaignId',
          params: [
            {
              publisherId: 'publisherId',
              placementId: 'placementId',
            }
          ]
        }
      })

      sandbox.assert.callCount(setupPageStub, 1);
      expect(analyticsAdapter.getContext()).to.deep.equal({
        adUnitCode: {
          bidId: 'seatBidId',
          campaignId: 'campaignId',
          placementId: 'placementId',
          publisherId: 'publisherId',
          variantId: 'creativeId'
        }
      })
    });
  });

  describe('trackEvent', function() {
    let getContextStub, getTimeStub;
    const adUnitCode = 'adUnitCode';

    beforeEach(function() {
      getContextStub = sandbox.stub(eightPodAnalytics, 'getContext');
      getTimeStub = sandbox.stub(Date.prototype, 'getTime').returns(1234);
      eightPodAnalytics.resetQueue();
      eightPodAnalytics.resetContext();
    });

    afterEach(function() {
      getContextStub.restore();
      getTimeStub.restore();
    });

    it('should add event to the queue', function() {
      getContextStub.returns({adUnitCode: {}});

      const event1 = {
        detail: {
          type: 'Counter',
          name: 'next_slide',
          payload: {
            from: '1.1',
            to: '2.2',
            value: 3
          }
        }
      }
      const result1 = {
        context: {},
        eventType: 'Counter',
        eventClass: 'adunit',
        timestamp: 1234,
        eventName: 'next_slide',
        payload: {
          from: '1.1',
          to: '2.2',
          value: 3
        }
      }

      const event2 = {
        detail: {
          type: 'Counter',
          name: 'pod_impression',
          payload: {
            value: 2
          }
        }
      }
      const result2 = {
        context: {},
        eventType: 'Counter',
        eventClass: 'adunit',
        timestamp: 1234,
        eventName: 'pod_impression',
        payload: {
          value: 2
        }
      }

      trackEvent(event1, adUnitCode)
      expect(queue).to.deep.equal([result1]);
      trackEvent(event2, adUnitCode);
      expect(queue).to.deep.equal([result1, result2]);
    });
  });
});
